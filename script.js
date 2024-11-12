$(async () => {
    setupUI()

    story.canvas = await loadObsidianCanvas("/obsidian/story.canvas")
    backstory.canvas = await loadObsidianCanvas("/obsidian/backstory.canvas")
    
    story.passages = loadPassages(story.canvas)
    backstory.passages = loadPassages(backstory.canvas)

    backstory.start = getTailId(backstory.passages, 'start')
    story.start = getTailId(story.passages, 'start')
    
    writeBranch(backstory.start, backstory.passages)
    scrollDown()
})


const story = {
    passages: [],
    canvas: null,
    start: "8e99ce06dd2141a8",
}
const backstory = {
    passages: [],
    canvas: null,
    start: null,
}

let history = []

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
        "#ffffff": "tail",
    }

    const imageNodes = []

    const passages = canvas.nodes.map(node => {
        if (node.type === 'group') {
            return
        }
        if (node.type === 'file') {
            imageNodes.push(node)
            return
        }
        return {
            id: node.id,
            message: passageMessage(node),
            type: types[node.color],
            next: passageLinks(node, canvas.edges),
            image: null
        }
    }).filter(result => result !== null)

    for (const img of imageNodes) {
        const imgDest = _.find(canvas.edges, { fromNode: img.id }).toNode
        _.find(passages, { id: imgDest }).image = img.file
    }

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
            // TODO
            directivesCount++
        }
        // message reaction
        else if (line.substring(0, 2) === '@r') {
            // TODO
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

function getTailId(passages, tailType) {
    return passages.find(p => {
        return p?.type === 'tail' && p?.message.text === '@'+tailType
    })?.id
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