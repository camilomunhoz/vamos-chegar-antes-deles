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

    get(key) {
        return this.items[key]
    }

    set(key, value) {
        this.items[key] = value
        this.save()
    }

    unset(key) {
        delete this.items[key]
        this.save()
    }

    undo(history, removedItems) {
        const sets = history.items.filter(item => {
            return item.operation === '@set'
        })

        const undoedVars = removedItems.filter(item => {
            return item.operation === '@set'
        }).map(item => item.data.key)

        for (let key of undoedVars) {
            let hasPreviousValue = false
            
            for (let i = sets.length - 1; i >= 0; i--) {
                if (sets[i].data.key === key) {
                    this.set(key, sets[i].data.value)
                    hasPreviousValue = true
                    break
                }
            }
            if (!hasPreviousValue) {
                this.unset(key)
            }
        }
    }

    clear() {
        localStorage.removeItem(this.storageKey)
    }
}