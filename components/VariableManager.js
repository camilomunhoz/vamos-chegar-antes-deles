export class VariableManager {
    constructor(gameName) {     
        this.storageKey = gameName + '-variables'
        this.items = this.getFromLocal() || {}
    }

    getFromLocal() {
        return JSON.parse(localStorage.getItem(this.storageKey))
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items))
    }

    set(key, value) {
        this.items[key] = value
        this.save()
    }

    clear() {
        localStorage.removeItem(this.storageKey)
    }
}