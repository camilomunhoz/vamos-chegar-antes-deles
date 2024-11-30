import { GUI } from './GUI.js'

export class Game extends GUI {
    constructor() {
        super()
        this.history = []
        this.story = null
    }

    setStory(story) {
        this.story = story
    }

    startGame(passage) {
        // TODO
    }

    
    writeBranchFrom(start) {
        let currentPassage = _.find(this.story.passages, {id: start})
        

        do {
            if (currentPassage) {
                this.writeMessage(currentPassage)
                currentPassage = _.find(this.story.passages, {id: currentPassage.goto[0]})
            }
        } while (currentPassage)
    }

    writeMessage(passage) {
        const whitelist = ['in', 'out', 'info']

        if (!_.contains(whitelist, passage.type)) {
            return
        }

        $('.chat-box').append(
            this.mountMessage(passage.message.text, passage.type, passage.message.time, passage.image)
        )
    }

    sendMessage(e) {
        const chosen = this.mountMessage($(e.target).html(), 'out')

        $('.responses').slideUp(100, () => {
            $('.chat-box').append(chosen)
            scrollDown()
        })
    }

    mountMessage(text, type, time = null, image = null) {
        if (!time) {
            const now = new Date()
            const hours = String(now.getHours()).padStart(2, '0')
            const minutes = String(now.getMinutes()).padStart(2, '0')
            time = `${hours}:${minutes}`
        }

        const classes = {
            'in': 'msg msg-in',
            'out': 'msg msg-out',
            'info': 'chat-box-info',
            // 'image': '',
            // 'audio': '',
        }

        const imgElement = image ? $('<img/>', {
            src: `/obsidian/${image}`,
        }).on('click', this.expandImage) : ''
        
        const message = $('<div/>', {
            class: classes[type],
        })
            .append(imgElement)
            .append(`<span class="msg-text">${text}</span>`)
            .append(type !== 'info' ? `
                <div class="msg-details">
                    <span class="msg-time">${time}</span>` +
                    (type === 'out' ? '<img class="dblcheck" src="/img/dbl-check.svg">' : '') +
                `</div>` : ''
            )

        return $('<div/>', {class: 'msg-container'}).append(message)
    }

} 