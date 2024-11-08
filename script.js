$(async () => {
    setup()

    // story.canvas = await loadObsidianCanvas("C:/Users/usuario/Documents/obsidian/brainlet/UFRGS/2024-02/SPM/Teste fluxograma.canvas")
    // backstory.canvas = await loadObsidianCanvas("C:/Users/usuario/Documents/obsidian/brainlet/UFRGS/2024-02/SPM/backstory.canvas")
    story.canvas = await loadObsidianCanvas("/story.json")
    backstory.canvas = await loadObsidianCanvas("/backstory.json")
    
    story.passages = loadPassages(story.canvas)
    backstory.passages = loadPassages(backstory.canvas)
    
    write(backstory.start, true)
})

const story = {
    passages: [],
    canvas: null,
    start: "8e99ce06dd2141a8",
}
const backstory = {
    passages: [],
    canvas: null,
    start: "588ae535d256b212",
}

let history = []

function setup() {
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
    return await $.get(path)
}

function loadPassages(canvas) {
    const types = {
        "4": "out", // enviada
        "3": "narrator",
        "1": "in", // recebida
        "5": "image",
        "?": "audio",
    }

    const passages = canvas.nodes.map(entry => {
        return {
            id: entry.id,
            message: passageMessage(entry),
            type: types[entry.color],
            next: passageLinks(entry)
        }
    })

    return passages
}

function passageMessage(passage) {
    const message = {time: null, delayMs: 0}
    const lines = passage.text.split('\n')
    const directivesCount = 0;

    for (let i = 0; lines < lines.length; i++) {
        // time directive
        if (lines[i].substring(0, 2) === '@t') {
            message.time = lines[i].slice(2)
            directivesCount++
        }
        // delay directive
        else if (lines[i].substring(0, 2) === '@d') {
            message.delayMs = Number(lines[i].slice(2))
            directivesCount++
        }
    }

    return {
        ...message,
        // removing directives and rejoining string to HTML
        text: lines.splice(0, directivesCount).join('<br>')
    }
}

function passageLinks(passage) {
    return story.canvas.edges.map(entry => {
        if (entry.fromNode === passage.id) {
            return entry.toNode
        }
    }).filter(result => result !== undefined);
}

function write(passageId, backstory) {

}

function sendMessage(e) {
    const chosen = mountMessage($(e.target).html(), 'msg msg-out')

    $('.responses').slideUp(100, () => {
        $('.chat-box').append(chosen)
        scrollDown()
    })
}

function mountMessage(text, classes, time = null) {
    if (!time) {
        const now = new Date()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        time = `${hours}:${minutes}`
    }
    
    return $('<div/>', {
            class: classes,
        })
        .html(
            text + `
                <div>
                    <span class="msg-time">${time}</span>
                    <img class="dblcheck" src="/img/dbl-check.svg">
                </div>
            `
        )
}

function scrollDown() {
    $('.chat-box').scrollTo('max', 200)
}