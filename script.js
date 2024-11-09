$(async () => {
    setupUI()

    story.canvas = await loadObsidianCanvas("/obsidian/story.canvas")
    backstory.canvas = await loadObsidianCanvas("/obsidian/backstory.canvas")
    
    story.passages = loadPassages(story.canvas)
    backstory.passages = loadPassages(backstory.canvas)
    
    writeBranch(backstory.start, backstory.passages)
})

const story = {
    passages: [],
    canvas: null,
    start: "8e99ce06dd2141a8",
}
const backstory = {
    passages: [],
    canvas: null,
    start: "5fad4337dc903866",
}

let history = []

function setupUI() {
    // Image visualization
    $('img').on('click', e => {
        const src = e.currentTarget.src
        $('.img-overlay').fadeIn(200).find('img')[0].src = src
    })
    $('.img-overlay').on('click', (e) => $(e.currentTarget).fadeOut(100))

    // Input events
    $('.response').on('click', sendMessage)
    $('.input-trigger').on('click', () => {
        $('.responses').slideToggle(100);
    })
    $('.chat-box, .chat-header').on('click', () => $('.responses').slideUp(100))
}

async function loadObsidianCanvas(path) {
    return await $.getJSON(path)
}

function loadPassages(canvas) {
    const types = {
        "1": "in", // recebida
        "4": "out", // enviada
        "3": "info",
        "5": "image",
        "?": "audio",
    }

    const passages = canvas.nodes.map(node => {
        return {
            id: node.id,
            message: passageMessage(node),
            type: types[node.color],
            next: passageLinks(node, canvas.edges),
        }
    })

    return passages
}

function passageMessage(passage) {
    const message = {time: null, delayMs: 0}
    const lines = passage.text.split('\n')
    let directivesCount = 0
    
    for (let line of lines) {
        // time directive
        if (line.substring(0, 2) === '@t') {
            message.time = line.slice(2).trim()
            directivesCount++
        }
        // delay directive
        else if (line.substring(0, 2) === '@d') {
            message.delayMs = Number(line.slice(2).trim())
            directivesCount++
        }
    }    

    return {
        ...message,
        // removing directives and rejoining string to HTML
        text: lines.splice(directivesCount).join('<br>').trim()
    }
}

function passageLinks(passage, allLinks) {
    return allLinks.map(link => {
        if (link.fromNode === passage.id) {
            return link.toNode
        }
    }).filter(result => result !== undefined)
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
    $('.chat-box').append(
        mountMessage(passage.message.text, passage.type, passage.message.time)
    )
}

function sendMessage(e) {
    const chosen = mountMessage($(e.target).html(), 'out')

    $('.responses').slideUp(100, () => {
        $('.chat-box').append(chosen)
        scrollDown()
    })
}

function mountMessage(text, type, time = null) {
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
    
    return $('<div/>', {
        class: classes[type],
    })
    .html(
        text + (type !== 'info' ? `
            <div>
                <span class="msg-time">${time}</span>
                <img class="dblcheck" src="/img/dbl-check.svg">
            </div>
        ` : '')
    )
}

function scrollDown() {
    $('.chat-box').scrollTo('max', 200)
}