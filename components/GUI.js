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

        $('.chat-box, .chat-actions').on('click', () => {
            if ($('.configs').hasClass('opened')) {
                this.toggleConfigs()
            }
        })

        $('.btn-configs').on('click', this.toggleConfigs)
    }

    expandImage(e) {
        const src = e.currentTarget.src
        $('.img-overlay').fadeIn(200).find('img')[0].src = src
    }
    
    mountMessage(passage, uniqueId) {
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
            'data-id': uniqueId,
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

    triggerTyping(ms, type) {
        let bubble = `
            <div class="typing-bubble" style="display: none">
                <span class="circle scaling"></span>
                <span class="circle scaling"></span>
                <span class="circle scaling"></span>
            </div>
        `
        if (type === 'info') {
            bubble = `
                <div class="typing-bubble info" style="display: none">
                    <span class="circle bouncing"></span>
                    <span class="circle bouncing"></span>
                    <span class="circle bouncing"></span>
                </div>
            `
        }
        $('.chat-box').append(bubble)

        if (type === 'info') {
            $('.typing-bubble').slideDown(100, () => this.scrollDown())
        } else {
            $('.typing-bubble').show(100, () => this.scrollDown())
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const $bubble = $('.chat-box .typing-bubble')

                if (type === 'info') {
                    $bubble.slideUp(100, function() {
                        $(this.remove())
                    })
                } else {
                    $bubble.hide(100, function() {
                        $(this.remove())
                    })
                }
                    
                resolve()
            }, ms)
        })
    }

    sleep(ms) {
        return new Promise(resolve => {
            setTimeout(() => resolve(), ms)
        })
    }

    scrollDown(ms = 200) {
        $('.chat-box').scrollTo('max', ms)
    }

    toggleConfigs() {
        if ($('.configs').hasClass('opened')) {
            $('.configs').removeClass('opened')
        } else {
            $('.configs').addClass('opened')
        }
    }
}