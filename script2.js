import Story from './Story.js'

$(async () => {
    setupUI()

    const story = new Story()
    const backstory = new Story()

    story.setup("/obsidian/story.canvas")
    backstory.setup("/obsidian/backstory.canvas")
    
    writeBranch(backstory.start, backstory.passages)
    scrollDown()
})

function setupUI() {
    // Image visualization
    $('.img-overlay').on('click', (e) => $(e.currentTarget).fadeOut(100))
    $('img').on('click', expandImage)

    // Input events
    $('.response').on('click', sendMessage)
    $('.input-trigger').on('click', () => {
        $('.responses').slideToggle(100);
    })
    $('.chat-box, .chat-header').on('click', () => $('.responses').slideUp(100))
}

function expandImage(e) {
    const src = e.currentTarget.src
    $('.img-overlay').fadeIn(200).find('img')[0].src = src
}

function startGame(passage) {
    // TODO
}

function writeBranch(start, passages) {
    let currentPassage = _.find(passages, {id: start})

    do {
        if (currentPassage) {
            writeMessage(currentPassage)
            currentPassage = _.find(passages, {id: currentPassage.next[0]})
        }
    } while (currentPassage)
}

function writeMessage(passage) {
    const whitelist = ['in', 'out', 'info']

    if (!_.contains(whitelist, passage.type)) {
        return
    }

    $('.chat-box').append(
        mountMessage(passage.message.text, passage.type, passage.message.time, passage.image)
    )
}

function sendMessage(e) {
    const chosen = mountMessage($(e.target).html(), 'out')

    $('.responses').slideUp(100, () => {
        $('.chat-box').append(chosen)
        scrollDown()
    })
}

function mountMessage(text, type, time = null, image = null) {
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
    }).on('click', expandImage) : ''
    
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

function scrollDown() {
    $('.chat-box').scrollTo('max', 200)
}