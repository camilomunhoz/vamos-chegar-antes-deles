import { GUI } from './GUI.js'
import { History } from './History.js'
import { VariableManager } from './VariableManager.js'
import { AudioPlayer } from './AudioPlayer.js'

export class Game extends GUI {
    constructor(gameName) {
        super()
        this.debug = false
        this.story = null
        this.gameName = gameName
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
        story.debug = this.debug
    }

    toggleDebug() {
        this.debug = !this.debug
        this.story.debug = this.debug
        if (this.debug) {
            $('.btn-debug .flag').html('ativado')
        } else {
            $('.btn-debug .flag').html('desativado')
        }
    }

    start() {
        $('.btn-undo').off('click').on('click', this.undoToLastInteraction.bind(this))
        $('.btn-debug').off('click').on('click', this.toggleDebug.bind(this))
        $('.btn-restart').off('click').on('click', this.restart.bind(this))

        this.audioPlayer.playLastSoundtrack(this.history)
        this.setUndoAllowance()

        /**
         * There is an inconsistency in the way the prop "goto" was made on command passages.
         * This "<= 1" is an easy workaround for when there is only the "@start" in history,
         * but it might be breaking everything when a history is load with last passage of
         * other command types such as "@if" and "@set".
         * 
         * No time to investigate nor fix it.
        */
        if (this.history.items.length <= 1/*=== 0*/) {
            this.history.clear() // provisory
            this.step(this.story.start)
        } else {
            this.writeLocallySaved()
        }
    }

    restart() {
        this.toggleConfigs()
        this.audioPlayer.stopCurrentSoundtracks()
        this.history.clear()
        this.vars.clear()
        this.allowWriting = false
        this.setUndoAllowance()
        $('.input-trigger').addClass('disabled')
        $('.responses').empty()
        $('.msg-out[data-id], .msg-in[data-id], .chat-box-info[data-id]').hide(400)
        setTimeout(() => {
            this.allowWriting = true
            this.start()
        }, 2000)
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
        let currentPassage = this.story.getPassageById(passageId)
    
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
                const uniqueId = await this.writeMessage(currentPassage, this.debug ? 0 : 1000, true, true)
                if (!this.allowWriting) return
    
                this.history.put(currentPassage, uniqueId)
            } else {
                return
            }
    
            const responsesIds = currentPassage.goto
            const nextPassageId = currentPassage.goto[0]
            const nextPassage = this.story.getPassageById(nextPassageId)
    
            // algo errado aqui. não é pra setar response se terminou
            if (await this.end(currentPassage, true) || nextPassage.type === 'out') {
                if (this.allowWriting) {
                    this.setResponses(responsesIds)
                    this.scrollDown()
                }
                return
            }
            currentPassage = nextPassage
        }
    }
  
    /**
     * In this function, the presence of delay is a synonym
     * of a message being sent "live", different from when
     * it is absent, which is likely to be from history.
     */
    async writeMessage(passage, delay = 1000, triggerAudios = true, generateUniqueId = false) {
        if (!this.allowWriting) return
        delay = this.debug ? 0 : delay

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
        
        if (triggerAudios && !this.debug) {
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
     * 
     * Kinda broken, does not support conditional nodes
     */
    writeBranchFrom(passageId) {
        let currentPassage = this.story.getPassageById(passageId)
        let nextPassageId = null
        
        do {
            if (currentPassage) {
                this.writeMessage(currentPassage, false, false)
                if (currentPassage.operation === '@start') {
                    nextPassageId = currentPassage.goto
                } else {
                    nextPassageId = currentPassage.goto[0]
                }
                currentPassage = this.story.getPassageById(nextPassageId)
            }
        } while (currentPassage)
    }

    setResponses(responsesIds) {
        responsesIds.forEach(nodeId => {
            const response = this.story.getPassageById(nodeId)
            $('.responses').append(
                $('<div/>', {class: 'response _btn-large msg msg-out'})
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
        $('.input-trigger').addClass('disabled')

        undoData.removedItems.map(el => el.uniqueId).forEach(id => {
            $(`.msg[data-id="${id}"], .chat-box-info[data-id="${id}"]`)
                .parent()
                .hide(400, () => {
                    $(this).remove()
                    /**
                     * Below hides a bug that allows to keep writing
                     * when a response is sent too fast after undo.
                     */
                    setTimeout(() => {
                        $('.responses').empty()
                        this.setResponses(undoData.lastBeforeInteraction.goto)
                    }, 500)
                })
        })

        $('.typing-bubble').hide(100)

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
                await this.end(passage, true)
        }

        return gotoId
    }

    /**
     * Temporary end implementation
     */
    async end(passage, triggerAudios = false) {
        const isEnd = passage.type === 'command' && passage.operation === '@end'
        if (isEnd) {
            if (triggerAudios && !this.debug) {
                this.audioPlayer.stopCurrentSoundtracks(500)
                this.audioPlayer.play({
                    type: '@soundtrack',
                    loop: true,
                    src: './obsidian/audio/soundtrack/TheEnd.mp3',
                })
            }
            const endPassage = {id: 'whatever123', type: 'info', message: {text: 'Fim'}, goto: []}

            const uniqueId = await this.writeMessage(endPassage, false, true, true)
            this.history.put(endPassage, uniqueId)
        }
        return isEnd
    }
} 