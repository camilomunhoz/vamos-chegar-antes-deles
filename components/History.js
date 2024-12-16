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

    put(item, uniqueId = null) {
        /**
         * As the same passage can be recorded multiple times, we must
         * ensure that they will not have the same memory reference.
         */
        const unlinked = { ...item }
        unlinked.uniqueId = uniqueId || this.generateUniqueId()

        this.items.push(unlinked)
        this.save()
    }    

    getLast() {
        return this.items.slice(-1).pop()
    }

    undo() {
        let lastBeforeInteraction = null
        const removedItems = []
    
        for (let i = this.items.length - 1; i >= 0; i--) {
            removedItems.push(this.items[i])
            if (this.items[i].type === 'out') {
                lastBeforeInteraction = this.items[i - 1]
                break
            }
        }
        this.removeLast(removedItems.length)
    
        return {
            removedItems: removedItems,
            lastBeforeInteraction: lastBeforeInteraction
        }
    }   

    removeLast(qty) {
        this.items = this.items.slice(0, Math.max(0, this.items.length - qty))
        this.save()
    }

    clear() {
        localStorage.removeItem(this.storageKey)
        this.items = []
    }

    generateUniqueId() {
        return '_' + Math.random().toString(36).substring(2, 11);
    }    
}