import { GUI } from './GUI.js'
import { History } from './History.js'

export class Game extends GUI {
    constructor(gameName) {
        super()
        this.story = null
        this.history = new History(gameName)
        this.audioPlayer = []
        this.allowWriting = true
        this.allowUndo = false
    }

    setStory(story) {
        this.story = story
    }

    start() {
        $('.btn-undo').on('click', this.goBackToLastInteraction.bind(this))

        this.playLastSoundtrack()
        this.setUndoAllowance()

        if (this.history.items.length === 0) {
            this.step(this.story.start)
        } else {
            this.writePassages(this.history.items)

            const lastPassage = this.history.getLast()
            const nextPassage = this.getPassageById(lastPassage.goto[0])

            if (nextPassage.type === 'out') {
                this.setResponses(lastPassage.goto)
            } else {
                this.step(nextPassage.id)
            }
        }
    }

    /**
     * Simulates a person typing on the chat.
     * 
     * Writes a chain of "in" or "info" nodes until
     * it waits an setup interaction nodes.
     * 
     * @param { String } passageId - head of chain
     */
    async step(passageId) {
        const passage = this.getPassageById(passageId)
        
        let responsesIds = passage.goto

        if (this.end(passage)) {
            return
        }

        await this.writeMessage(passage)
        this.history.put(passage)
        
        let current = this.getPassageById(passage.goto[0])

        if (this.end(current)) {
            return
        }

        while (current.type !== 'out') {
            await this.writeMessage(current)

            if (this.allowWriting) {
                this.history.put(current)
                responsesIds = current.goto
    
                current = this.getPassageById(current.goto[0])
                if (this.end(current)) {
                    return
                }
            } else {
                break
            }
        }

        if (this.allowWriting) {
            this.setResponses(responsesIds)
        }
    }

    end(passage) {
        const isEnd = passage.type === 'tail' && passage.message.text === '@end'
        if (isEnd) {
            // * temporary
            const endPassage = {id: 'whatever123', type: 'info', message: {text: 'fim!'}, audio: []}

            this.writeMessage(endPassage)
            this.history.put(endPassage)
        }
        return isEnd
    }

    getPassageById(passageId) {
        return _.find(this.story.passages, {id: passageId})
    }
    
    /**
     * Write an ordered list of passages.
     * Does not take into account "goto" relations.
     */
    writePassages(passages) {
        passages.forEach(passage => {
            this.writeMessage(passage, false)
        })
    }
    
    /**
     * Take one node and crawl all the way to an end,
     * always through the first "goto" node.
     */
    writeBranchFrom(passageId) {
        let currentPassage = this.getPassageById(passageId)

        do {
            if (currentPassage) {
                this.writeMessage(currentPassage, false)
                currentPassage = this.getPassageById(currentPassage.goto[0])
            }
        } while (currentPassage)
    }

    async writeMessage(passage, delay = 2000) {       
        const whitelist = ['in', 'out', 'info']

        if (!_.contains(whitelist, passage.type)) {
            return
        }

        if (delay) {
            if (passage.message.delayMs) {
                delay = passage.message.delayMs
            }
            await this.triggerTyping(delay)
            
            /**
             * Being here prevents sound triggering in
             * passthrough writing (no delay), e.g. history restoring
             */
            this.triggerAudios(passage.audio)
        }

        if (this.allowWriting) {
            $('.chat-box').append(
                this.mountMessage(passage)
            )
        }
        
        if (delay) {
            this.scrollDown()
        }
    }

    setResponses(responsesIds) {
        responsesIds.forEach(nodeId => {
            const response = this.getPassageById(nodeId)
            $('.responses').append(
                $('<div/>', {class: 'response msg msg-out'})
                    .html(response.message.text)
                    .on('click', () => { this.sendMessage(nodeId) })
            )
            $('.input-trigger').removeClass('disabled')
        })
    }

    sendMessage(passageId) {
        const passage = this.getPassageById(passageId)
        this.allowWriting = true

        $('.responses').slideUp(100, () => {
            $('.responses').empty()
            $('.input-trigger').addClass('disabled')
            this.writeMessage(passage, false)
            this.history.put(passage)
            this.scrollDown()
            this.step(passage.goto[0])
            this.setUndoAllowance()
        })

    }

    triggerAudios(audioList) {
        if (!audioList.length) return

        for (const aud of audioList) {
            if (this.audioPlayer.length && aud.type === '@soundtrack') {
                this.stopCurrentSoundtrack(500)
            }
            this.playAudio(aud)
        }
    }

    playAudio(aud) {
        const alreadyPlayed = _.find(this.audioPlayer, { src: aud.src })

        if (alreadyPlayed) {
            alreadyPlayed.howl.play()
        } else {
            const audio = new Howl({
                src: aud.src,
                loop: aud.loop,
                volume: 0,
                onplay: () => audio.fade(0, 1, 1000)
            })
            audio.play()

            this.audioPlayer.push({
                src: aud.src,
                type: aud.type,
                playing: aud.type === "@soundtrack",
                howl: audio
            })
        }
    }

    stopCurrentSoundtrack(fadeMs = 0) {
        const current = _.find(this.audioPlayer, { playing: true })
        if (current) {
            if (fadeMs) {
                current.howl.fade(1, 0, fadeMs)
                setTimeout(() => current.howl.stop(), fadeMs)
            } else {
                current.howl.stop()
            }
            current.playing = false
        }
    }

    playLastSoundtrack() {
        const current = _.find(this.audioPlayer, { playing: true })
        let target = null

        // Find the last soundtrack in the history
        for (let i = this.history.items.length - 1; i >= 0; i--) {    
            if (this.history.items[i].audio.length) {
                const track = _.find(this.history.items[i].audio, { type: '@soundtrack' })
                if (track) {
                    target = track
                    break
                }
            }
        }

        if (target && (!current || target.src !== current.src)) {
            if (current) {
                this.stopCurrentSoundtrack()
            }
            this.playAudio(target)
        }
    }

    goBackToLastInteraction() {
        // TODO: make loops undoable. unique ids when written maybe
        if (!this.allowUndo) {
            return
        }
        this.allowWriting = false

        const undoData = this.history.undo()

        if (!undoData.lastBeforeInteraction) {
            return
        }

        undoData.removeList.forEach(id => {
            $(`.msg[data-id="${id}"], .chat-box-info[data-id="${id}"]`).hide(400, () => {
                $(this).remove()
            })
        })

        $('.responses').empty()
        this.setResponses(undoData.lastBeforeInteraction.goto)

        this.playLastSoundtrack()
        this.setUndoAllowance()
        this.scrollDown()
    }

    setUndoAllowance() {
        if (_.find(this.history.items, {type: 'out'})) {
            this.allowUndo = true
            $('.btn-undo').removeClass('disabled')
        } else {
            this.allowUndo = false
            $('.btn-undo').addClass('disabled')
        }
    }
} 