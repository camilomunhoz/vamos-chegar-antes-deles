export class Story {
    constructor() {
        this.passages = []
        this.canvas = null
        this.start = null

        this.nodeTypes = {
            "1": "in", // received message
            "4": "out", // sent message
            "3": "info",
            "5": "image",
            "?": "audio",
            "#ffffff": "tail", // start and endings
        }
    }

    async setup(canvasPath) {
        this.canvas = await this.loadObsidianCanvas(canvasPath)
        this.setPassages()
    }

    async loadObsidianCanvas(path) {
        return await $.getJSON(path)
    }

    setPassages() {
        if (!this.canvas) {
            throw new Error('You must load an Obsidian Canvas first.')
        }

        const imageNodes = []
    
        const passages = this.canvas.nodes.map(node => {
            if (node.type === 'group') {
                return
            }
            if (node.type === 'file') {
                imageNodes.push(node)
                return
            }
            return {
                id: node.id,
                type: this.nodeTypes[node.color],
                message: this.getPassageMessage(node),
                goto: this.getPassageGoTos(node),
                image: null
            }
        }).filter(result => result !== null)
    
        for (const img of imageNodes) {
            const imgDest = _.find(this.canvas.edges, { fromNode: img.id }).toNode
            _.find(passages, { id: imgDest }).image = img.file
        }
        
        this.passages = passages
        this.start = this.getStartId()
    }

    getPassageMessage(passage) {
        const message = {time: null, delayMs: 0}
        const lines = passage.text.split('\n')
        let directivesCount = 0
        
        for (let line of lines) {
            // timestamp directive
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
    
    getPassageGoTos(passage) {
        return this.canvas.edges.map(link => {
            if (link.fromNode === passage.id) {
                return link.toNode
            }
        }).filter(result => result !== undefined)
    }

    getStartId() {
        return this.passages.find(p => {
            return p?.type === 'tail' && p?.message.text === '@start'
        })?.id
    }
}