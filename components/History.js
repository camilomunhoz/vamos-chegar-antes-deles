export class History {
    constructor(gameName) {     
        this.storageKey = gameName + '-history'
        this.items = this.getFromLocal() || []
    }

    getFromLocal() {
        return JSON.parse(localStorage.getItem(this.storageKey))
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items))
    }

    put(item) {
        this.items.push(item)
        this.save()
    }

    getLast() {
        return this.items.slice(-1).pop()
    }

    undo() {
        let lastBeforeInteraction = null
        const removeList = []

        for (let i = this.items.length - 1; i >= 0; i--) {
            removeList.push(this.items[i].id)
            if (this.items[i].type === 'out') {
                lastBeforeInteraction = this.items[i - 1]
                break
            }
        }
        this.removeLast(removeList.length)

        return {
            removeList: removeList,
            lastBeforeInteraction: lastBeforeInteraction
        }
    }

    removeLast(qty) {
        this.items = this.items.slice(0, Math.max(0, this.items.length - qty))
        this.save()
    }

    clear() {
        localStorage.removeItem(this.storageKey)
    }

}