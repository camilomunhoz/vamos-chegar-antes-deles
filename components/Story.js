export class Story {
    constructor() {
        this.passages = []
        this.canvas = null
        this.start = null
        this.debug = false

        this.nodeTypes = {
            "1": "in",   // received message
            "4": "out",  // sent message
            "3": "info", // info box
            "#ffffff": 'command', // any unprintable passages
        }
    }

    async setup(canvasPath) {
        this.canvas = await this.loadObsidianCanvas(canvasPath)
        this.setPassages()
    }

    setDebug(bool) {
        this.debug = bool
    }

    async loadObsidianCanvas(path) {
        return await $.getJSON(path)
    }

    getPassageById(passageId) {
        return _.find(this.passages, {id: passageId})
    }

    setPassages() {
        if (!this.canvas) {
            throw new Error('You must load an Obsidian Canvas first.')
        }

        const imageNodes = []
        const audioNodes = []
    
        const passages = this.canvas.nodes.map(node => {
            if (node.type === 'group') {
                return
            }
            if (node.type === 'file') {
                if (node.file.split('/')[0] === 'images') {
                    imageNodes.push(node)
                }
                else if (node.file.split('/')[0] === 'audio') {
                    audioNodes.push(node)
                }
                return
            }
            if (this.nodeTypes[node.color] === 'command') {
                return this.setCommandPassage(node)
            } else {
                return {
                    id: node.id,
                    type: this.nodeTypes[node.color],
                    message: this.getPassageMessage(node),  
                    goto: this.getPassageGoTos(node),
                    image: null,
                    audio: [],
                }
            }
        }).filter(result => result !== null)
        
        this.passages = passages
        this.setPassagesImages(imageNodes)
        this.setPassagesAudio(audioNodes)
        this.cleanUpPassages()
        this.start = this.getStartId()
    }

    setPassagesImages(imageNodes) {
        for (const img of imageNodes) {
            const imgDestinationId = _.find(this.canvas.edges, { fromNode: img.id }).toNode
            _.find(this.passages, { id: imgDestinationId }).image = "/obsidian/"+img.file
        }
    }

    setPassagesAudio(audioNodes) {
        for (const aud of audioNodes) {
            const middlewareId = _.find(this.canvas.edges, { fromNode: aud.id }).toNode
            const middleware = _.find(this.canvas.nodes, { id: middlewareId })
            const audioType = middleware.text
            const audioDestinationId = _.find(this.canvas.edges, { fromNode: middleware.id }).toNode
            const passage = _.find(this.passages, { id: audioDestinationId })

            passage.audio.push({
                src: "/obsidian/"+aud.file,
                type: audioType,
                loop: audioType === '@soundtrack',
            })
        }
    }

    setCommandPassage(node) {       
        const passage = {}
        if (node.text === '@start') {
            passage.operation = '@start'
            passage.goto = this.getPassageGoTos(node)[0]
        }
        else if (node.text === '@end') {
            passage.operation = '@end'
        }
        else if (node.text.substring(0, 5) === '@set ') {
            passage.operation = '@set'
            passage.goto = this.getPassageGoTos(node)[0]
            
            const [key, value] = node.text
                                    .slice(5)
                                    .split('=')
                                    .map(el => el.trim())
            passage.data = {
                key: key,
                value: value,
            }
        }
        else if (node.text.substring(0, 4) === '@if ') {
            passage.operation = '@if'
            const gotoIds = this.getPassageGoTos(node)
            
            const gotos = _.filter(this.canvas.nodes, item => {
                return item.id === gotoIds[0] || item.id === gotoIds[1]
            })

            const trueNode = _.find(gotos, { text: 'true' }).id
            const falseNode = _.find(gotos, { text: 'false' }).id

            const gotoTrueId = _.find(this.canvas.edges, { fromNode: trueNode }).toNode
            const gotoFalseId = _.find(this.canvas.edges, { fromNode: falseNode }).toNode

            passage.data = {
                flag: node.text.slice(4),
                goto: {
                    true: gotoTrueId,
                    false: gotoFalseId,
                }
            }
        }
        return {
            id: node.id,
            type: this.nodeTypes[node.color],
            ...passage,
        }
    }

    cleanUpPassages() {
        this.passages = this.passages
            .filter(p => p !== undefined)
            .filter(p => p?.type !== undefined)
    }

    getPassageMessage(passage) {
        const message = {
            time: null,
            delayMs: 0,
            typingMs: this.debug ? 0 : 2000
        }
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
                message.delayMs = line.slice(2).trim()
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
            return p?.type === 'command' && p?.operation === '@start'
        })?.id
    }
}