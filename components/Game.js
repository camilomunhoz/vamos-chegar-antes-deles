import { GUI } from './GUI.js'

export class Game extends GUI {
    constructor(gameName) {
        super()
        this.story = null
        this.setHistory(gameName)
    }

    setStory(story) {
        this.story = story
    }

    setHistory(gameName) {
        const key = gameName + '-history'
        let history = localStorage.getItem(key)

        if (!history || history.length === 0) {
            history = localStorage.setItem(key, JSON.stringify([]))
        }
        this.history = JSON.parse(localStorage.getItem(key))
    }

    start() {
        if (this.history.length === 0) {
            this.step(this.story.start)
        } else {
            this.step(this.history.findLast().id)
        }
    }

    async step(passageId) {
        const passage = this.getPassageById(passageId)

        if (this.end(passage)) {
            return
        }

        await this.writeMessage(passage)
        
        let responsesIds = passage.goto
        let current = this.getPassageById(passage.goto[0])

        if (this.end(current)) {
            return
        }

        while (current.type !== 'out') {
            await this.writeMessage(current)
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
        })
    }

    sendMessage(passageId) {
        const passage = this.getPassageById(passageId)

        $('.responses').slideUp(100, () => {
            $('.responses').empty()
            this.writeMessage(passage, false)
            this.scrollDown()
            this.step(passage.goto[0])
        })
    }
} 