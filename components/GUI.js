export class GUI {
    constructor() {
        this.setup()
    }
    
    setup() {
        // Image visualization
        $('.img-overlay').on('click', (e) => $(e.currentTarget).fadeOut(100))
        $('img').on('click', this.expandImage)

        // Input events
        $('.input-trigger').on('click', () => {
            $('.responses').slideToggle(100);
        })
        $('.chat-box, .chat-header').on('click', () => $('.responses').slideUp(100))
    }

    expandImage(e) {
        const src = e.currentTarget.src
        $('.img-overlay').fadeIn(200).find('img')[0].src = src
    }
    
    mountMessage(passage) {
        if (!passage.message.time) {
            const now = new Date()
            const hours = String(now.getHours()).padStart(2, '0')
            const minutes = String(now.getMinutes()).padStart(2, '0')
            passage.message.time = `${hours}:${minutes}`
        }

        const classes = {
            'in': 'msg msg-in',
            'out': 'msg msg-out',
            'info': 'chat-box-info',
            // 'image': '',
            // 'audio': '',
        }

        const imgElement = passage.image ? $('<img/>', {
            src: passage.image,
        }).on('click', this.expandImage) : ''
        
        const message = $('<div/>', {
            class: classes[passage.type],
            'data-id': passage.id,
        })
            .append(imgElement)
            .append(`<span class="msg-text">${passage.message.text}</span>`)
            .append(passage.type !== 'info' ? `
                <div class="msg-details">
                    <span class="msg-time">${passage.message.time}</span>` +
                    (passage.type === 'out' ? '<img class="dblcheck" src="/img/dbl-check.svg">' : '') +
                `</div>` : ''
            )

        return $('<div/>', {class: 'msg-container'}).append(message)
    }

    triggerTyping(ms) {
        return new Promise(resolve => {
            setTimeout(() => {
                // TODO: typing animation
                resolve()
            }, ms)
        })
    }

    scrollDown() {
        $('.chat-box').scrollTo('max', 200)
    }
}