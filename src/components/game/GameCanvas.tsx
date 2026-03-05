'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { GameNote } from '@/types/game'
import { TWINKLE_TWINKLE } from '@/data/twinkleTwinkle'
import { findNoteByMidi } from '@/data/violinNotes'
import { parseMidi } from '@/lib/midi/parser'
import type { MidiFile } from '@/lib/midi/types'
import { mapMidiToViolin, getTrackInfo, type MappedSong, type TrackInfo } from '@/lib/midi/mapper'
import { drawBackground, drawNote, drawLeftPanel, drawEdgeFades, drawSlurArcs, drawChordConnectors, drawPositionLines } from '@/lib/game/renderer'
import { saveLocalSong, loadLocalSong, deleteLocalSong, listLocalSongs } from '@/lib/localSongs'
import { updateNotes } from '@/lib/game/noteTrack'
import { CANVAS_WIDTH, CANVAS_HEIGHT, NOTE_RADIUS, LEAD_IN_SEC } from '@/lib/game/constants'

import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useNotation } from '@/contexts/NotationContext'
import { Music, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GameControls from './GameControls'
import SongSelector from './SongSelector'
import ProgressBar from './ProgressBar'
import ScoreView from './ScoreView'

function deepCloneNotes(notes: GameNote[]): GameNote[] {
  return notes.map((n) => ({ ...n }))
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const PLAYLIST_THUMB_COLORS = [
  'bg-green-900',
  'bg-blue-900',
  'bg-amber-900',
  'bg-red-900',
  'bg-purple-900',
  'bg-teal-900',
]

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
  const [view, setView] = useState<'game' | 'score'>('game')
  const { notation } = useNotation()

  const activePositionsRef = useRef<number[]>([])
  const [playlist, setPlaylist] = useState<{ id: string; title: string; durationSec?: number }[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(0)
  const playlistRef = useRef<{ id: string; title: string; durationSec?: number }[]>([])
  const playlistIndexRef = useRef(0)
  const autoPlayAfterLoadRef = useRef(false)
  const [autoAdvanceTo, setAutoAdvanceTo] = useState<string | null>(null)

  const notesRef = useRef<GameNote[]>([])
  const songRef = useRef<MappedSong | null>(null)
  const parsedMidiRef = useRef<MidiFile | null>(null)
  const parsedMusicXmlRef = useRef<string | null>(null)
  const midiTitleRef = useRef('')
  /** Pre-mapped tracks from saved multi-track songs (index → GameNote[]) */
  const savedTracksRef = useRef<Map<number, GameNote[]> | null>(null)
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
          const centerIdx = activeIdx >= 0 ? activeIdx : (hintNote ? notes.indexOf(hintNote) : -1)
          const surroundingNotes = centerIdx >= 0 ? notes.slice(Math.max(0, centerIdx - 3), centerIdx + 4) : undefined
          const displayNote = activeNote ?? hintNote
          const chordNotes = displayNote
            ? notes.filter((n) => n.state !== 'passed' && Math.abs(n.startTimeSec - displayNote.startTimeSec) < 0.025)
            : []
          drawBackground(ctx, notationRef.current)
          drawPositionLines(ctx, notes)
          drawChordConnectors(ctx, notes)
          for (const note of notes) {
            drawNote(ctx, note, showFingersRef.current, notationRef.current)
          }
          drawEdgeFades(ctx)
          drawSlurArcs(ctx, notes)
          drawLeftPanel(ctx, activeNote, hintNote, notationRef.current, surroundingNotes, showFingersRef.current, activePositionsRef.current, chordNotes)

        }
      }
    }

    // Auto-stop at end — advance playlist if available
    if (statusRef.current === 'playing' && song && currentTimeRef.current >= song.durationSec + 1) {
      const nextIdx = playlistIndexRef.current + 1
      if (nextIdx < playlistRef.current.length) {
        autoPlayAfterLoadRef.current = true
        setAutoAdvanceTo(playlistRef.current[nextIdx].id)
      } else {
        audio.stop()
        setStatus('idle')
        currentTimeRef.current = -LEAD_IN_SEC
      }
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
    },
    [audio],
  )

  // Fetch all songs for playlist
  const fetchPlaylist = useCallback(async () => {
    const entries: { id: string; title: string; durationSec?: number }[] = [
      { id: 'twinkle', title: 'Twinkle Twinkle Little Star', durationSec: TWINKLE_TWINKLE.durationSec },
    ]
    try {
      const res = await fetch('/api/songs')
      const data = await res.json()
      if (Array.isArray(data)) entries.push(...data.map((s: { _id: string; title: string; durationSec?: number }) => ({ id: s._id, title: s.title, durationSec: s.durationSec })))
    } catch { /* DB unavailable */ }
    entries.push(...listLocalSongs().map((s) => ({ id: s.id, title: s.title, durationSec: s.durationSec })))
    setPlaylist(entries)
    playlistRef.current = entries
  }, [])

  // Load demo on mount (only once)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    loadSong(TWINKLE_TWINKLE)
    fetchPlaylist()
  }, [loadSong, fetchPlaylist])

  // Auto-advance to next song when current ends
  useEffect(() => {
    if (!autoAdvanceTo) return
    setAutoAdvanceTo(null)
    handleLoadSavedSong(autoAdvanceTo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceTo])

  // Auto-play after song loads (when advancing playlist)
  useEffect(() => {
    if (!autoPlayAfterLoadRef.current || !currentSong) return
    autoPlayAfterLoadRef.current = false
    ;(async () => {
      await audio.init()
      audio.setVolume(volumeRef.current)
      audio.setMuted(isMutedRef.current)
      audio.schedule(notesRef.current, speedRef.current, LEAD_IN_SEC)
      currentTimeRef.current = -LEAD_IN_SEC
      audio.seekTo(0, speedRef.current)
      audio.play()
      setStatus('playing')
    })()
  }, [currentSong, audio])

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

  // Helper: convert DB-format notes back to GameNote[]
  const dbNotesToGameNotes = useCallback((dbNotes: Record<string, unknown>[]): GameNote[] => {
    const STRING_TO_LANE: Record<string, number> = { G: 0, D: 1, A: 2, E: 3 }
    return dbNotes.map((n, i) => {
      const needsRecovery = n.position == null || n.staffPosition == null
      const vNote = needsRecovery ? findNoteByMidi(Number(n.midiNumber)) : undefined
      const str = (vNote?.string ?? n.string) as GameNote['string']
      return {
        id: `db-${i}`,
        midiNumber: n.midiNumber as number,
        noteName: (vNote?.name ?? n.noteName) as string,
        string: str,
        finger: (vNote?.finger ?? n.finger) as number,
        lane: vNote ? STRING_TO_LANE[vNote.string] : (n.lane as number),
        startTimeSec: n.startTimeSec as number,
        durationSec: n.durationSec as number,
        y: 0,
        tailHeight: 0,
        state: 'upcoming' as const,
        staffPosition: (vNote?.staffPosition ?? (n.staffPosition as number) ?? 0),
        accidental: (vNote?.accidental ?? (n.accidental as 'sharp' | 'flat' | undefined)),
        position: (vNote?.position ?? (n.position != null ? Number(n.position) : undefined)),
        slurStart: n.slurStart as boolean | undefined,
        slurEnd: n.slurEnd as boolean | undefined,
      }
    })
  }, [])

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

  /** Serialize GameNote[] to DB-format note fields */
  const serializeNotes = useCallback((notes: GameNote[]) =>
    notes.map((n) => ({
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
    const payload: Record<string, unknown> = {
      title,
      bpm: song.bpm,
      ticksPerBeat: song.ticksPerBeat,
      durationSec: song.durationSec,
      notes: noteFields(song),
      isBuiltIn: false,
    }
    if (song.tracks && song.tracks.length > 1) {
      payload.tracks = song.tracks.map((t) => ({
        index: t.index,
        name: t.name,
        noteCount: t.noteCount,
        isBestGuess: t.isBestGuess,
        notes: serializeNotes(t.notes),
      }))
    }
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) return (await res.json())._id as string
    } catch { /* DB unavailable */ }
    return saveLocalSong({ ...song, title })
  }, [noteFields, serializeNotes])

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

          // Map all parts to build a single song with embedded tracks
          const mappedParts = (partInfos as TrackInfo[])
            .map((p) => ({
              info: p,
              mapped: parseMusicXmlToSong(xmlString, name, p.index),
            }))
            .filter((p) => p.mapped.notes.length > 0)

          if (mappedParts.length === 0) {
            setError('No playable violin notes found in this MusicXML file.')
            return
          }

          const bestMapped = mappedParts.find((p) => p.info.index === bestIdx) ?? mappedParts[0]
          loadSong(bestMapped.mapped)

          const songToSave: MappedSong = {
            ...bestMapped.mapped,
            title: name,
            tracks: mappedParts.length > 1
              ? mappedParts.map((p) => ({
                  index: p.info.index,
                  name: p.info.name,
                  noteCount: p.info.noteCount,
                  isBestGuess: p.info.isBestGuess,
                  notes: p.mapped.notes,
                }))
              : undefined,
          }

          const id = await saveSong(songToSave, name)
          await fetchPlaylist()
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

        // Map all viable tracks to build a single song with embedded tracks
        const mappedTracks = tracks
          .map((t) => ({
            info: t,
            mapped: mapMidiToViolin(midi, name, t.index),
          }))
          .filter((t) => t.mapped.notes.length > 0)

        if (mappedTracks.length === 0) {
          setError('No playable violin notes found in this MIDI file.')
          return
        }

        const bestMapped = mappedTracks.find((t) => t.info.index === bestIdx) ?? mappedTracks[0]
        loadSong(bestMapped.mapped)

        const songToSave: MappedSong = {
          ...bestMapped.mapped,
          title: name,
          tracks: mappedTracks.length > 1
            ? mappedTracks.map((t) => ({
                index: t.info.index,
                name: t.info.name || `Track ${t.info.index + 1}`,
                noteCount: t.info.noteCount,
                isBestGuess: t.info.isBestGuess,
                notes: t.mapped.notes,
              }))
            : undefined,
        }

        const id = await saveSong(songToSave, name)
        await fetchPlaylist()
        if (id) setSelectedSongId(id)
        return id
      } catch (err) {
        console.error('MIDI parse error:', err)
        setError(`Failed to parse MIDI file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [loadSong, saveSong, fetchPlaylist],
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
      await fetchPlaylist()
      if (selectedSongId === songId) {
        setSelectedSongId('twinkle')
        loadSong(TWINKLE_TWINKLE)
        setAvailableTracks([])
        setSelectedTrackIndex(null)
        parsedMidiRef.current = null
        parsedMusicXmlRef.current = null
        savedTracksRef.current = null
      }
    },
    [selectedSongId, loadSong, fetchPlaylist],
  )

  // Track/part change
  const handleTrackChange = useCallback(
    (trackIndex: number) => {
      setSelectedTrackIndex(trackIndex)

      // Path 1: MusicXML still in memory (just uploaded)
      if (parsedMusicXmlRef.current) {
        import('@/lib/musicxml/parser').then(({ parseMusicXmlToSong }) => {
          const song = parseMusicXmlToSong(parsedMusicXmlRef.current!, midiTitleRef.current, trackIndex)
          if (song.notes.length === 0) { setError('No playable violin notes in this part.'); return }
          setError(null)
          loadSong(song)
        })
        return
      }

      // Path 2: MIDI still in memory (just uploaded)
      if (parsedMidiRef.current) {
        const song = mapMidiToViolin(parsedMidiRef.current, midiTitleRef.current, trackIndex)
        if (song.notes.length === 0) {
          setError('No playable violin notes in this track.')
          return
        }
        setError(null)
        loadSong(song)
        return
      }

      // Path 3: Saved song with embedded tracks
      if (savedTracksRef.current) {
        const trackNotes = savedTracksRef.current.get(trackIndex)
        if (!trackNotes || trackNotes.length === 0) {
          setError('No playable violin notes in this track.')
          return
        }
        setError(null)
        const durationSec = trackNotes.length > 0
          ? trackNotes[trackNotes.length - 1].startTimeSec + trackNotes[trackNotes.length - 1].durationSec
          : 0
        const song: MappedSong = {
          title: songRef.current?.title ?? midiTitleRef.current,
          bpm: songRef.current?.bpm ?? 120,
          ticksPerBeat: songRef.current?.ticksPerBeat ?? 480,
          durationSec,
          notes: trackNotes,
        }
        loadSong(song)
      }
    },
    [loadSong],
  )

  /** Restore track selector from embedded tracks data */
  const restoreTracks = useCallback((
    tracks: Array<{ index: number; name: string; noteCount: number; isBestGuess: boolean; notes: unknown[] }>,
    isDbFormat: boolean,
  ) => {
    if (!tracks || tracks.length <= 1) {
      setAvailableTracks([])
      setSelectedTrackIndex(null)
      savedTracksRef.current = null
      return
    }
    setAvailableTracks(tracks.map((t) => ({
      index: t.index,
      name: t.name,
      noteCount: t.noteCount,
      inRangePercent: 100,
      isBestGuess: t.isBestGuess,
    })))
    const best = tracks.find((t) => t.isBestGuess) ?? tracks[0]
    setSelectedTrackIndex(best.index)
    const map = new Map<number, GameNote[]>()
    for (const t of tracks) {
      map.set(
        t.index,
        isDbFormat
          ? dbNotesToGameNotes(t.notes as Record<string, unknown>[])
          : (t.notes as GameNote[]),
      )
    }
    savedTracksRef.current = map
  }, [dbNotesToGameNotes])

  // Load saved song
  const handleLoadSavedSong = useCallback(
    async (songId: string) => {
      setError(null)
      setSelectedSongId(songId)
      // Track position in playlist for auto-advance
      const idx = playlistRef.current.findIndex((s) => s.id === songId)
      if (idx >= 0) { playlistIndexRef.current = idx; setPlaylistIndex(idx) }
      // Clear state
      setAvailableTracks([])
      setSelectedTrackIndex(null)
      parsedMidiRef.current = null
      parsedMusicXmlRef.current = null
      savedTracksRef.current = null

      if (songId === 'twinkle') {
        loadSong(TWINKLE_TWINKLE)
        return
      }
      if (songId.startsWith('local-')) {
        const localSong = loadLocalSong(songId)
        if (localSong) {
          loadSong(localSong)
          if (localSong.tracks && localSong.tracks.length > 1) {
            restoreTracks(localSong.tracks, false)
          }
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
          notes: dbNotesToGameNotes(data.notes),
        }
        loadSong(song)
        if (data.tracks && data.tracks.length > 1) {
          restoreTracks(data.tracks, true)
        }
      } catch (err) {
        console.error('Song load error:', err)
        setError(`Failed to load song: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [loadSong, dbNotesToGameNotes, restoreTracks],
  )

  return (
    <div className='flex flex-col overflow-hidden gap-2' style={{ height: 'calc(100vh - 58px)' }}>
      {error && (
        <div className='shrink-0 px-4 py-1 text-sm text-destructive bg-destructive/10 border-b border-destructive/30'>
          {error}
        </div>
      )}

      {/* Main area */}
      <div className='flex-1 min-h-0 relative overflow-hidden'>
        {/* Game canvas */}
        <div className={`absolute inset-0 flex items-center justify-center ${view === 'game' ? '' : 'invisible pointer-events-none'}`}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className='block'
            style={{ height: '100%', width: 'auto', maxWidth: '100%' }}
          />
          {view === 'game' && playlist.length > 1 && (
            <div className='absolute top-3 right-3 w-[220px] bg-card/95 border border-border rounded-lg shadow-lg backdrop-blur-sm overflow-hidden flex flex-col'>
              <div className='px-3 py-2 border-b border-border flex items-center justify-between shrink-0'>
                <p className='text-[10px] text-muted-foreground uppercase tracking-widest'>Playlist</p>
                <p className='text-[10px] text-muted-foreground'>{playlistIndex + 1} / {playlist.length}</p>
              </div>
              <div className='playlist-scroll overflow-y-auto max-h-[320px]'>
                {playlist.map((song, idx) => (
                  <button
                    key={song.id}
                    onClick={() => handleLoadSavedSong(song.id)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 text-left transition-colors hover:bg-accent/60 ${idx === playlistIndex ? 'bg-accent' : ''}`}
                  >
                    <div className={`shrink-0 rounded flex items-center justify-center text-[11px] font-bold text-white/70 ${PLAYLIST_THUMB_COLORS[idx % PLAYLIST_THUMB_COLORS.length]}`} style={{ width: 38, height: 28 }}>
                      {song.title.charAt(0).toUpperCase()}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className={`text-xs leading-tight line-clamp-2 ${idx === playlistIndex ? 'font-semibold' : ''}`}>{song.title}</p>
                      {song.durationSec != null && (
                        <p className='text-[10px] text-muted-foreground mt-0.5'>{formatDuration(song.durationSec)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Score view */}
        {view === 'score' && currentSong && (
          <ScoreView
            song={currentSong}
            getCurrentTime={() => currentTimeRef.current}
            status={status}
          />
        )}
      </div>

      {/* Unified bottom bar: controls | progress | song selector */}
      <div className='shrink-0 flex items-center gap-3 border-t border-border bg-card/50 px-3 py-2'>
        <Button
          variant={view === 'score' ? 'secondary' : 'ghost'}
          size='icon-sm'
          onClick={() => setView((v) => v === 'game' ? 'score' : 'game')}
          title={view === 'game' ? 'Show score' : 'Show game'}
        >
          {view === 'game' ? <Music className='size-4' /> : <Gamepad2 className='size-4' />}
        </Button>
        <div className='h-5 border-l border-border' />
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
