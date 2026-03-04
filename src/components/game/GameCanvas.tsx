'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { GameNote } from '@/types/game'
import { TWINKLE_TWINKLE } from '@/data/twinkleTwinkle'
import { findNoteByMidi } from '@/data/violinNotes'
import { parseMidi } from '@/lib/midi/parser'
import type { MidiFile } from '@/lib/midi/types'
import { mapMidiToViolin, getTrackInfo, type MappedSong, type TrackInfo } from '@/lib/midi/mapper'
import { drawBackground, drawNote, drawLeftPanel, drawEdgeFades } from '@/lib/game/renderer'
import { saveLocalSong, loadLocalSong, deleteLocalSong } from '@/lib/localSongs'
import { updateNotes } from '@/lib/game/noteTrack'
import { CANVAS_WIDTH, CANVAS_HEIGHT, NOTE_RADIUS, LEAD_IN_SEC } from '@/lib/game/constants'
import { detectSections, getNextSection, type SongSection } from '@/lib/game/sectionDetector'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useNotation } from '@/contexts/NotationContext'
import GameControls from './GameControls'
import SongSelector from './SongSelector'
import ProgressBar from './ProgressBar'

function deepCloneNotes(notes: GameNote[]): GameNote[] {
  return notes.map((n) => ({ ...n }))
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const currentTimeRef = useRef(0)

  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [speed, setSpeed] = useState(1.0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [showFingers, setShowFingers] = useState(true)
  const [currentSong, setCurrentSong] = useState<MappedSong | null>(null)
  const [selectedSongId, setSelectedSongId] = useState('twinkle')
  const [availableTracks, setAvailableTracks] = useState<TrackInfo[]>([])
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { notation } = useNotation()

  const [nextSection, setNextSection] = useState<SongSection | null>(null)
  const sectionsRef = useRef<SongSection[]>([])
  const activePositionsRef = useRef<number[]>([])
  const nextSectionRef = useRef<SongSection | null>(null)

  const notesRef = useRef<GameNote[]>([])
  const songRef = useRef<MappedSong | null>(null)
  const parsedMidiRef = useRef<MidiFile | null>(null)
  const parsedMusicXmlRef = useRef<string | null>(null)
  const midiTitleRef = useRef('')
  const speedRef = useRef(speed)
  const showFingersRef = useRef(showFingers)
  const statusRef = useRef(status)
  const notationRef = useRef(notation)
  const volumeRef = useRef(volume)
  const isMutedRef = useRef(isMuted)

  const audio = useAudioEngine()

  // Keep refs in sync
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    showFingersRef.current = showFingers
  }, [showFingers])
  useEffect(() => {
    statusRef.current = status
  }, [status])
  useEffect(() => {
    notationRef.current = notation
  }, [notation])
  useEffect(() => {
    volumeRef.current = volume
  }, [volume])
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  // Render loop
  const renderFrame = useCallback(() => {
    if (statusRef.current === 'playing') {
      currentTimeRef.current = audio.getTransportSeconds(speedRef.current) - LEAD_IN_SEC
    }

    const song = songRef.current

    const canvas = canvasRef.current
    {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const notes = notesRef.current
          const activeNote = updateNotes(notes, currentTimeRef.current, speedRef.current)
          const hintNote = notes.find((n) => n.state === 'upcoming') ?? null

          // Clip each note's tail so it doesn't visually merge into the next note in the same lane
          for (let i = 0; i < notes.length; i++) {
            if (notes[i].tailHeight <= 0) continue
            for (let j = i + 1; j < notes.length; j++) {
              if (notes[j].lane === notes[i].lane) {
                const maxTail = notes[i].y - notes[j].y - NOTE_RADIUS
                notes[i].tailHeight = Math.min(notes[i].tailHeight, Math.max(0, maxTail))
                break
              }
            }
          }

          const activeIdx = activeNote ? notes.indexOf(activeNote) : -1
          const surroundingNotes = activeIdx >= 0 ? notes.slice(Math.max(0, activeIdx - 3), activeIdx + 4) : undefined
          drawBackground(ctx, notationRef.current)
          for (const note of notes) {
            drawNote(ctx, note, showFingersRef.current, notationRef.current)
          }
          drawEdgeFades(ctx)
          drawLeftPanel(ctx, activeNote, hintNote, notationRef.current, surroundingNotes, showFingersRef.current, activePositionsRef.current)

          // Update upcoming section overlay
          const upcoming = getNextSection(sectionsRef.current, currentTimeRef.current)
          if (upcoming !== nextSectionRef.current) {
            nextSectionRef.current = upcoming
            setNextSection(upcoming)
          }
        }
      }
    }

    // Auto-stop at end (runs in both modes)
    if (statusRef.current === 'playing' && song && currentTimeRef.current >= song.durationSec + 1) {
      audio.stop()
      setStatus('idle')
      currentTimeRef.current = -LEAD_IN_SEC
    }

    animRef.current = requestAnimationFrame(renderFrame)
  }, [audio])

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(animRef.current)
  }, [renderFrame])

  // Load song
  const loadSong = useCallback(
    (song: MappedSong) => {
      audio.stop()
      setStatus('idle')
      currentTimeRef.current = -LEAD_IN_SEC

      const notes = deepCloneNotes(song.notes)
      notesRef.current = notes
      songRef.current = song
      setCurrentSong(song)

      const allPositions = [...new Set(song.notes.map((n) => n.position ?? 1))]
      activePositionsRef.current = allPositions.some((p) => p > 1) ? allPositions : []
      sectionsRef.current = detectSections(song.notes, song.durationSec)
      nextSectionRef.current = null
      setNextSection(null)
    },
    [audio],
  )

  // Load demo on mount (only once)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    loadSong(TWINKLE_TWINKLE)
  }, [loadSong])

  // Play / Pause
  const handlePlayPause = useCallback(async () => {
    if (status === 'playing') {
      audio.pause()
      setStatus('paused')
    } else {
      await audio.init()
      // Apply current volume/mute after init (effect may have fired before engine existed)
      audio.setVolume(volumeRef.current)
      audio.setMuted(isMutedRef.current)
      if (status === 'idle') {
        if (songRef.current) {
          notesRef.current = deepCloneNotes(songRef.current.notes)
          audio.schedule(notesRef.current, speedRef.current, LEAD_IN_SEC)
          currentTimeRef.current = -LEAD_IN_SEC
          audio.seekTo(0, speedRef.current)
        }
      }
      audio.play()
      setStatus('playing')
    }
  }, [status, audio])

  // Global keyboard shortcuts (Space = play/pause, ArrowLeft/Right = seek ±5s)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayPause()
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault()
        const delta = e.code === 'ArrowRight' ? 5 : -5
        const newTime = Math.max(0, currentTimeRef.current + delta)
        currentTimeRef.current = newTime
        audio.seekTo(newTime + LEAD_IN_SEC, speedRef.current)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlayPause, audio])

  // Restart
  const handleRestart = useCallback(() => {
    audio.stop()
    currentTimeRef.current = -LEAD_IN_SEC
    if (songRef.current) {
      notesRef.current = deepCloneNotes(songRef.current.notes)
    }
    setStatus('idle')
  }, [audio])

  // Speed change
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed)
      if (songRef.current && statusRef.current !== 'idle') {
        audio.schedule(notesRef.current, newSpeed, LEAD_IN_SEC)
        audio.seekTo(currentTimeRef.current + LEAD_IN_SEC, newSpeed)
        if (statusRef.current === 'playing') {
          audio.play()
        }
      }
    },
    [audio],
  )

  // Volume
  useEffect(() => {
    audio.setVolume(volume)
  }, [volume, audio])
  useEffect(() => {
    audio.setMuted(isMuted)
  }, [isMuted, audio])

  // Seek from progress bar
  const handleSeek = useCallback(
    (time: number) => {
      currentTimeRef.current = time
      audio.seekTo(time + LEAD_IN_SEC, speedRef.current)
    },
    [audio],
  )

  // Shared helper to serialize note fields for DB/local storage
  const noteFields = useCallback((s: MappedSong) =>
    s.notes.map((n) => ({
      midiNumber: n.midiNumber,
      noteName: n.noteName,
      string: n.string,
      finger: n.finger,
      lane: n.lane,
      startTimeSec: n.startTimeSec,
      durationSec: n.durationSec,
      staffPosition: n.staffPosition,
      accidental: n.accidental,
      position: n.position,
      slurStart: n.slurStart,
      slurEnd: n.slurEnd,
    })), [])

  const saveSong = useCallback(async (song: MappedSong, title: string): Promise<string | undefined> => {
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          bpm: song.bpm,
          ticksPerBeat: song.ticksPerBeat,
          durationSec: song.durationSec,
          notes: noteFields(song),
          isBuiltIn: false,
        }),
      })
      if (res.ok) return (await res.json())._id as string
    } catch { /* DB unavailable */ }
    return saveLocalSong({ ...song, title })
  }, [noteFields])

  // File upload — supports .mid/.midi and .musicxml/.mxl
  const handleFileUpload = useCallback(
    async (file: File): Promise<string | undefined> => {
      setError(null)
      const ext = file.name.split('.').pop()?.toLowerCase()

      // ── MusicXML path ─────────────────────────────────────────────────────
      if (ext === 'musicxml' || ext === 'mxl') {
        try {
          const { getMusicXmlPartInfo, parseMusicXmlToSong, decompressMxlToXml } = await import('@/lib/musicxml/parser')
          const buffer = await file.arrayBuffer()
          const name = file.name.replace(/\.(musicxml|mxl)$/i, '')

          const xmlString = ext === 'mxl'
            ? await decompressMxlToXml(buffer)
            : new TextDecoder().decode(buffer)

          parsedMusicXmlRef.current = xmlString
          parsedMidiRef.current = null
          midiTitleRef.current = name

          const partInfos = getMusicXmlPartInfo(xmlString)
          setAvailableTracks(partInfos as TrackInfo[])
          const bestPart = partInfos.find((p) => p.isBestGuess)
          const bestIdx = bestPart?.index ?? 0
          setSelectedTrackIndex(bestIdx)

          const song = parseMusicXmlToSong(xmlString, name, bestIdx)
          if (song.notes.length === 0) {
            setError('No playable violin notes found in this MusicXML file.')
            return
          }
          loadSong(song)

          const id = await saveSong(song, name)
          if (id) setSelectedSongId(id)
          return id
        } catch (err) {
          console.error('MusicXML parse error:', err)
          setError(`Failed to parse MusicXML: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        return
      }

      // ── MIDI path ─────────────────────────────────────────────────────────
      try {
        const buffer = await file.arrayBuffer()
        const midi = parseMidi(buffer)
        const name = file.name.replace(/\.(mid|midi)$/i, '')

        parsedMidiRef.current = midi
        parsedMusicXmlRef.current = null
        midiTitleRef.current = name
        const tracks = getTrackInfo(midi)
        setAvailableTracks(tracks)
        const bestTrack = tracks.find((t) => t.isBestGuess)
        const bestIdx = bestTrack ? bestTrack.index : 0
        setSelectedTrackIndex(bestIdx)

        const tracksWithNotes = tracks.filter((t) => mapMidiToViolin(midi, name, t.index).notes.length > 0)

        if (tracksWithNotes.length === 0) {
          setError('No playable violin notes found in this MIDI file.')
          return
        }

        const bestSong = mapMidiToViolin(midi, name, bestIdx)
        loadSong(bestSong)

        const saveOne = async (trackIdx: number, trackName: string): Promise<string | undefined> => {
          const s = mapMidiToViolin(midi, name, trackIdx)
          if (s.notes.length === 0) return undefined
          const title = tracksWithNotes.length > 1 ? `${name} — ${trackName}` : name
          return saveSong(s, title)
        }

        const ids = await Promise.all(tracksWithNotes.map((t) => saveOne(t.index, t.name || `Track ${t.index + 1}`)))

        const bestTrackInList = tracksWithNotes.findIndex((t) => t.index === bestIdx)
        const bestId = ids[bestTrackInList >= 0 ? bestTrackInList : 0]
        if (bestId) setSelectedSongId(bestId)
        return bestId
      } catch (err) {
        console.error('MIDI parse error:', err)
        setError(`Failed to parse MIDI file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [loadSong, saveSong],
  )

  // Delete song
  const handleDeleteSong = useCallback(
    async (songId: string) => {
      if (songId.startsWith('local-')) {
        deleteLocalSong(songId)
      } else {
        try {
          await fetch(`/api/songs/${songId}`, { method: 'DELETE' })
        } catch {
          // best-effort
        }
      }
      if (selectedSongId === songId) {
        setSelectedSongId('twinkle')
        loadSong(TWINKLE_TWINKLE)
        setAvailableTracks([])
        setSelectedTrackIndex(null)
        parsedMidiRef.current = null
        parsedMusicXmlRef.current = null
      }
    },
    [selectedSongId, loadSong],
  )

  // Track/part change
  const handleTrackChange = useCallback(
    (trackIndex: number) => {
      setSelectedTrackIndex(trackIndex)
      if (parsedMusicXmlRef.current) {
        import('@/lib/musicxml/parser').then(({ parseMusicXmlToSong }) => {
          const song = parseMusicXmlToSong(parsedMusicXmlRef.current!, midiTitleRef.current, trackIndex)
          if (song.notes.length === 0) { setError('No playable violin notes in this part.'); return }
          setError(null)
          loadSong(song)
        })
        return
      }
      if (!parsedMidiRef.current) return
      const song = mapMidiToViolin(parsedMidiRef.current, midiTitleRef.current, trackIndex)
      if (song.notes.length === 0) {
        setError('No playable violin notes in this track.')
        return
      }
      setError(null)
      loadSong(song)
    },
    [loadSong],
  )

  // Load saved song
  const handleLoadSavedSong = useCallback(
    async (songId: string) => {
      setError(null)
      setSelectedSongId(songId)
      // Clear track selector for non-MIDI songs
      setAvailableTracks([])
      setSelectedTrackIndex(null)
      parsedMidiRef.current = null
      if (songId === 'twinkle') {
        loadSong(TWINKLE_TWINKLE)
        return
      }
      if (songId.startsWith('local-')) {
        const localSong = loadLocalSong(songId)
        if (localSong) {
          loadSong(localSong)
        } else {
          setError('Local song not found.')
        }
        return
      }
      try {
        const res = await fetch(`/api/songs/${songId}`)
        if (!res.ok) {
          setError(`Failed to load song (status ${res.status})`)
          return
        }
        const data = await res.json()
        const song: MappedSong = {
          title: data.title,
          bpm: data.bpm,
          ticksPerBeat: data.ticksPerBeat,
          durationSec: data.durationSec,
          notes: data.notes.map((n: Record<string, unknown>, i: number) => {
            const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 }
            // Old DB records lack position — fully re-derive from violinNotes
            const needsRecovery = n.position == null || n.staffPosition == null
            const vNote = needsRecovery ? findNoteByMidi(Number(n.midiNumber)) : undefined
            return {
              id: `db-${i}`,
              midiNumber: n.midiNumber,
              noteName: vNote?.name ?? n.noteName,
              string: vNote?.string ?? n.string,
              finger: vNote?.finger ?? n.finger,
              lane: vNote ? STRING_TO_LANE[vNote.string] : (n.lane as number),
              startTimeSec: n.startTimeSec,
              durationSec: n.durationSec,
              y: 0,
              tailHeight: 0,
              state: 'upcoming' as const,
              staffPosition: vNote?.staffPosition ?? (n.staffPosition as number) ?? 0,
              accidental: vNote?.accidental ?? (n.accidental as 'sharp' | 'flat' | undefined),
              position: vNote?.position ?? (n.position != null ? Number(n.position) : undefined),
              slurStart: n.slurStart as boolean | undefined,
              slurEnd: n.slurEnd as boolean | undefined,
            }
          }),
        }
        loadSong(song)
      } catch (err) {
        console.error('Song load error:', err)
        setError(`Failed to load song: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [loadSong],
  )

  return (
    <div className='flex flex-col overflow-hidden gap-2' style={{ height: 'calc(100vh - 58px)' }}>
      {error && (
        <div className='shrink-0 px-4 py-1 text-sm text-destructive bg-destructive/10 border-b border-destructive/30'>
          {error}
        </div>
      )}

      {/* Canvas area */}
      <div className='flex-1 min-h-0 relative flex items-center justify-center overflow-hidden'>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className='block'
          style={{ height: '100%', width: 'auto', maxWidth: '100%' }}
        />
        {nextSection && (
          <div className='absolute top-3 right-3 w-[180px] bg-card/90 border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm pointer-events-none'>
            <p className='text-[10px] text-muted-foreground uppercase tracking-widest mb-1'>Upcoming Section</p>
            <p className='text-sm font-semibold'>{nextSection.name}</p>
            <p className='text-xs text-muted-foreground'>{nextSection.noteCount} notes</p>
          </div>
        )}
      </div>

      {/* Unified bottom bar: controls | progress | song selector */}
      <div className='shrink-0 flex items-center gap-3 border-t border-border bg-card/50 px-3 py-2'>
        <GameControls
          status={status}
          speed={speed}
          volume={volume}
          isMuted={isMuted}
          showFingers={showFingers}
          onPlayPause={handlePlayPause}
          onRestart={handleRestart}
          onSpeedChange={handleSpeedChange}
          onVolumeChange={setVolume}
          onMuteToggle={() => setIsMuted((m) => !m)}
          onFingersToggle={() => setShowFingers((f) => !f)}
        />
        <div className='h-5 border-l border-border' />
        <ProgressBar
          getCurrentTime={() => currentTimeRef.current}
          totalDuration={songRef.current?.durationSec ?? 0}
          onSeek={handleSeek}
          status={status}
        />
        <div className='h-5 border-l border-border' />
        <SongSelector
          currentSongTitle={currentSong?.title ?? ''}
          onFileUpload={handleFileUpload}
          onSelectSong={handleLoadSavedSong}
          onDeleteSong={handleDeleteSong}
          onTrackChange={handleTrackChange}
          selectedSongId={selectedSongId}
          availableTracks={availableTracks}
          selectedTrackIndex={selectedTrackIndex}
        />
      </div>
    </div>
  )
}
