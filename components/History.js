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
        for (let i; i >= 0; i--) {
            if (this.items[i].type === 'out') {
                return this.items[i - 1]
            }
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