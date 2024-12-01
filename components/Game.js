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
            this.writeMessage({type: 'info', message: {text: 'fim!'}})
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
        const whitelist = ['in', 'out', 'info']

        if (!_.contains(whitelist, passage.type)) {
            return
        }

        if (delay) {
            await this.triggerTyping(2000)
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
} 