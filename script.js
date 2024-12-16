import { Story } from './components/Story.js'
import { Game } from './components/Game.js'

$(async () => {
    await boot()
})

const game = new Game('vamos-chegar-antes-deles')

async function boot() {
    const story = new Story()
    await story.setup("/obsidian/story.canvas")

    const backstory = new Story()
    await backstory.setup("/obsidian/backstory.canvas")
    game.setStory(backstory)
    game.writeBranchFrom(backstory.start)
    
    game.setStory(story)
    game.start()
    game.scrollDown()

    // console.log(backstory);
    // console.log(story);

    $('.btn-restart').off('click').on('click', restart)
}

async function restart() {
    game.reset()
    await boot()
}
