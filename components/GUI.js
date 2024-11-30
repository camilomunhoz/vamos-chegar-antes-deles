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

    scrollDown() {
        $('.chat-box').scrollTo('max', 200)
    }
}