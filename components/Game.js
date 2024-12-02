import { GUI } from './GUI.js'
import { History } from './History.js'

export class Game extends GUI {
    constructor(gameName) {
        super()
        this.story = null
        this.history = new History(gameName)
    }

    setStory(story) {
        this.story = story
    }

    start() {
        $('.btn-undo').on('click', this.goBackToLastInteraction.bind(this))

        if (this.history.items.length === 0) {
            this.step(this.story.start)
        } else {
            const lastPassage = this.history.getLast()
            this.history.removeLast(1)
            this.writePassages(this.history.items)
            this.step(lastPassage.id)
        }
    }

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
            this.history.put(current)

            responsesIds = current.goto

            current = this.getPassageById(current.goto[0])
            if (this.end(current)) {
                return
            }
        }

        this.setResponses(responsesIds)
    }

    end(passage) {
        const isEnd = passage.type === 'tail' && passage.message.text === '@end'
        if (isEnd) {
            // * temporary
            const endPassage = {id: 'whatever123', type: 'info', message: {text: 'fim!'}}

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

    async writeMessage(passage, delay = true) {
        this.handleAudio(passage)

        const whitelist = ['in', 'out', 'info']

        if (!_.contains(whitelist, passage.type)) {
            return
        }

        if (delay) {
            await this.triggerTyping(500)
        }

        $('.chat-box').append(
            this.mountMessage(passage)
        )
        
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

        $('.responses').slideUp(100, () => {
            $('.responses').empty()
            $('.input-trigger').addClass('disabled')
            this.writeMessage(passage, false)
            this.history.put(passage)
            this.scrollDown()
            this.step(passage.goto[0])
        })
    }

    handleAudio(passage) {
        if (passage.audio.length) {
            for (const aud of passage.audio) {
                if (this.soundtrack && aud.type === '@soundtrack') {
                    console.log('stop');
                    // Howl.stop(this.soundtrack)
                }

                console.log('play')
                const player = new Howl({
                    src: aud.src,
                    loop: aud.loop,
                    // html5: true,
                    // volume: 0
                })
                // player.play()
                this.soundtrack = player.play()              
                // player.fade(0, 1, 1000)
            }
        }
    }

    goBackToLastInteraction() {
        // TODO: fix undo after undoing everything
        // TODO: make loops undoable. unique ids when written maybe
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
        this.scrollDown()
        this.setResponses(undoData.lastBeforeInteraction.goto)
    }
} 