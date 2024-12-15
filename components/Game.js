import { GUI } from './GUI.js'
import { History } from './History.js'
import { VariableManager } from './VariableManager.js'
import { AudioPlayer } from './AudioPlayer.js'

export class Game extends GUI {
    constructor(gameName) {
        super()
        this.story = null
        this.vars = new VariableManager(gameName)
        this.history = new History(gameName)
        this.audioPlayer = new AudioPlayer()
        this.allowWriting = true
        this.allowUndo = false
    }

    /**
     * @param { Story } story instance 
     */
    setStory(story) {
        this.story = story
    }

    start() {
        $('.btn-undo').on('click', this.undoToLastInteraction.bind(this))

        this.audioPlayer.playLastSoundtrack(this.history)
        this.setUndoAllowance()

        if (this.history.items.length === 0) {
            this.step(this.story.start)
        } else {
            this.writeLocallySaved()
        }
    }

    /**
     * Simulates a person typing on the chat.
     * 
     * Process a chain of "in", "info" or "command" nodes
     * until there is need of player interaction.
     * 
     * @param { String } passageId - head of chain
     */
    async step(passageId) {
        let currentPassage = this.story.getPassageById(passageId);
    
        while (currentPassage)
        {    
            if (currentPassage.type === 'command') {
                const commandGotoId = await this.handleCommand(currentPassage)
                if (this.allowWriting) {
                    this.history.put(currentPassage)
                    if (currentPassage.operation === '@end'){
                        return
                    } else {
                        currentPassage = this.story.getPassageById(commandGotoId)
                        continue
                    }
                } else {
                    return
                }
            }
    
            if (this.allowWriting) {
                const uniqueId = await this.writeMessage(currentPassage, 0/*1000*/, true, true);
                if (!this.allowWriting) return;
    
                this.history.put(currentPassage, uniqueId);
            } else {
                return;
            }
    
            const responsesIds = currentPassage.goto;
            const nextPassageId = currentPassage.goto[0];
            const nextPassage = this.story.getPassageById(nextPassageId);
    
            // algo errado aqui. não é pra setar response se terminou
            if (await this.end(currentPassage) || nextPassage.type === 'out') {
                if (this.allowWriting) {
                    this.setResponses(responsesIds);
                }
                return;
            }
            currentPassage = nextPassage;
        }
    }
  
    /**
     * In this function, the presence of delay is a synonym
     * of a message being sent "live", different from when
     * it is absent, which is likely to be from history.
     */
    async writeMessage(passage, delay = 0/*1000*/, triggerAudios = true, generateUniqueId = false) {
        if (!this.allowWriting) return

        const uniqueId = generateUniqueId ? this.history.generateUniqueId() : passage.uniqueId
        const whitelist = ['in', 'out', 'info']
        
        if (!_.contains(whitelist, passage.type)) {
            return uniqueId
        }
        
        const animated = !!delay
        const $message = this.mountMessage(passage, uniqueId)

        if (animated) {
            $message.attr('style', 'display: none')

            if (passage.message.delayMs) {
                delay = passage.message.delayMs
            }
            await this.sleep(delay)
            if (!this.allowWriting) return

            await this.triggerTyping(passage.message.typingMs, passage.type)
            if (!this.allowWriting) return
        }
        
        if (triggerAudios) {
            this.audioPlayer.triggerAudios(passage.audio)
        }
        
        $('.chat-box').append($message)

        if (animated) {
            // made that way to support future animations
            $message.show(0, () => this.scrollDown())
        }
        return uniqueId
    }

    /**
     * Writes all the history saved on localStorage and
     * resume the game from where it stopped.
     */
    writeLocallySaved() {
        this.writePassages(this.history.items)

        const lastPassage = this.history.getLast()
        const nextPassage = this.story.getPassageById(lastPassage.goto[0])

        if (nextPassage) {
            if (nextPassage.type === 'out') {
                this.setResponses(lastPassage.goto)
            } else {
                this.step(nextPassage.id)
            }
        }
    }
    
    /**
     * Write an ordered list of passages.
     * Does not take into account "goto" relations.
     */
    writePassages(passages) {
        passages.forEach(passage => {
            this.writeMessage(passage, false, false)
        })
    }
    
    /**
     * Take one node and crawl all the way to an end,
     * always through the first "goto" node.
     */
    writeBranchFrom(passageId) {
        let currentPassage = this.story.getPassageById(passageId)

        do {
            if (currentPassage) {
                this.writeMessage(currentPassage, false, false)
                currentPassage = this.story.getPassageById(currentPassage.goto[0])
            }
        } while (currentPassage)
    }

    setResponses(responsesIds) {
        responsesIds.forEach(nodeId => {
            const response = this.story.getPassageById(nodeId)
            $('.responses').append(
                $('<div/>', {class: 'response msg msg-out'})
                    .html(response.message.text)
                    .on('click', () => { this.sendMessage(nodeId) })
            )
            $('.input-trigger').removeClass('disabled')
        })
    }

    sendMessage(passageId) {
        const passage = this.story.getPassageById(passageId)
        this.allowWriting = true

        $('.responses').slideUp(100, async () => {
            $('.responses').empty()
            $('.input-trigger').addClass('disabled')
            const uniqueId = await this.writeMessage(passage, false, true, true)
            this.history.put(passage, uniqueId)
            this.scrollDown()
            this.step(passage.goto[0])
            this.setUndoAllowance()
        })
    }

    undoToLastInteraction() {
        if (!this.allowUndo) return
        
        this.allowWriting = false

        const undoData = this.history.undo()

        if (!undoData.lastBeforeInteraction) {
            return
        }

        this.vars.undo(this.history, undoData.removedItems)

        undoData.removedItems.map(el => el.uniqueId).forEach(id => {
            $(`.msg[data-id="${id}"], .chat-box-info[data-id="${id}"]`)
                .parent()
                .hide(400, () => {
                    $(this).remove()
                })
        })

        $('.typing-bubble').hide(100)
        $('.responses').empty()
        this.setResponses(undoData.lastBeforeInteraction.goto)

        this.audioPlayer.playLastSoundtrack(this.history)
        this.setUndoAllowance()
        this.scrollDown()
    }

    setUndoAllowance() {
        if (_.find(this.history.items, {type: 'out'})) {
            this.allowUndo = true
            $('.btn-undo').removeClass('disabled')
        } else {
            this.allowUndo = false
            $('.btn-undo').addClass('disabled')
        }
    }

    async handleCommand(passage) {
        let gotoId = null
        let flag = null

        switch (passage.operation) {
            case '@set':
                this.vars.set(passage.data.key, passage.data.value)
                gotoId = passage.goto
                break
            case '@if':
                flag = this.vars.get(passage.data.flag) || false
                gotoId = passage.data.goto[''+flag]
                break
            case '@start':
                gotoId = passage.goto
                break
            case '@end':
                await this.end(passage)
        }

        return gotoId
    }

    /**
     * Temporary end implementation
     */
    async end(passage) {
        const isEnd = passage.type === 'command' && passage.operation === '@end'
        if (isEnd) {
            const endPassage = {id: 'whatever123', type: 'info', message: {text: 'fim!'}, goto: []}

            const uniqueId = await this.writeMessage(endPassage, false, true, true)
            this.history.put(endPassage, uniqueId)
        }
        return isEnd
    }
} 