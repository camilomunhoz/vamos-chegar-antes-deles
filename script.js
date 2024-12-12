import { Story } from './components/Story.js'
import { Game } from './components/Game.js'

$(async () => {
    const game = new Game('vamos-chegar-antes-deles')
    const story = new Story()
    const backstory = new Story()

    await story.setup("/obsidian/story.canvas")
    // await backstory.setup("/obsidian/backstory.canvas")
    
    // game.setStory(backstory)
    // game.writeBranchFrom(backstory.start)
    
    game.setStory(story)

    game.start()
    game.scrollDown()

    // console.log(backstory);
    console.log(story);
})