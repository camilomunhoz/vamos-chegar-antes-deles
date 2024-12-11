export class AudioPlayer {
    constructor() {
        this.tracks = []
    }
    
    triggerAudios(audioList) {
        if (!audioList?.length) return

        const currentSoundtrack = this.getCurrentSoundtracks()[0]

        for (const aud of audioList) {
            // Checks if there is need to replace the current soundtrack 
            if (this.tracks.length && aud.type === '@soundtrack') {
                if (currentSoundtrack?.src !== aud.src) {
                    this.stopCurrentSoundtracks(500)
                }
            }
            this.play(aud)
        }
    }

    /**
     * Plays track considering if it has already been played and
     * if it is currently playing. Saves Howl instance if not.
     */
    play(track) {
        const alreadyPlayed = _.find(this.tracks, { src: track.src })

        if (alreadyPlayed) {
            if (!alreadyPlayed.playing) {
                alreadyPlayed.howl.play()
                alreadyPlayed.playing = true
            }
        } else {
            const audio = new Howl({
                src: track.src,
                loop: track.loop,
                volume: 0,
                onplay: () => audio.fade(0, 1, 1000)
            })
            audio.play()

            this.tracks.push({
                src: track.src,
                type: track.type,
                playing: track.type === "@soundtrack", // @sfx are set "playing: false" immediately
                howl: audio
            })
        }
    }

    stop(track, fadeMs = 0) {
        if (fadeMs) {
            track.howl.fade(1, 0, fadeMs)
            setTimeout(() => track.howl.stop(), fadeMs)
        } else {
            track.howl.stop()
        }
        track.playing = false
    }
        
    /**
     * For now, there is suppose to not be more than
     * one soundtrack playing at once, but it is
     * already structured to support so in the future.
     */
    getCurrentSoundtracks() {
        return _.where(this.tracks, { playing: true })
    }

    stopCurrentSoundtracks(fadeMs = 0) {        
        const current = this.getCurrentSoundtracks()

        if (current.length) {
            for (let track of current) {
                this.stop(track, fadeMs)
            }
        }
    }

    playLastSoundtrack(history) {
        const current = _.find(this.tracks, { playing: true })
        let target = null

        // Find the last soundtrack in the history
        for (let i = history.items.length - 1; i >= 0; i--) {    
            if (history.items[i].audio?.length) {
                const track = _.find(history.items[i].audio, { type: '@soundtrack' })
                if (track) {
                    target = track
                    break
                }
            }
        }

        if (target && (!current || target.src !== current.src)) {
            if (current) {
                this.stopCurrentSoundtracks()
            }
            this.play(target)
        } else if (!target) {
            this.stopCurrentSoundtracks()
        }
    }
}