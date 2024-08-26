require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    SlashCommandBuilder 
} = require('discord.js');
const db = require('./database.js');

// Initialize the client object
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder().setName('explain')
        .setDescription('Add an explanation to a topic')
        .addStringOption(option => option.setName('topic').setDescription('Topic to explain').setRequired(true))
        .addStringOption(option => option.setName('explanation').setDescription('Explanation for the topic').setRequired(true)),

    new SlashCommandBuilder().setName('explore')
        .setDescription('Explore explanations')
        .addStringOption(option => option.setName('topic').setDescription('Topic to explore').setRequired(true)),

    new SlashCommandBuilder().setName('leaderboard')
        .setDescription('Show the upvote leaderboard'),

    new SlashCommandBuilder().setName('start')
        .setDescription('Start a pomodoro session')
        .addIntegerOption(option => option.setName('study').setDescription('Study time in minutes').setRequired(true))
        .addIntegerOption(option => option.setName('break').setDescription('Break time in minutes').setRequired(true)),

    new SlashCommandBuilder().setName('stop')
        .setDescription('Stop the pomodoro session'),

    new SlashCommandBuilder().setName('request')
        .setDescription('Request a topic to be explained')
        .addStringOption(option => option.setName('topic').setDescription('Topic to request').setRequired(true)),

    new SlashCommandBuilder().setName('requestboard')
        .setDescription('Show the top 10 most requested topics')
];

client.once('ready', async () => {
    console.log('Bot is online!');
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set(commands);
    }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'explore') {
        const topicName = options.getString('topic').toLowerCase();

        db.get(`SELECT id FROM topics WHERE name = ?`, [topicName], (err, topic) => {
            if (err) {
                console.error('Error fetching topic:', err);
                return interaction.reply({ content: 'An error occurred while accessing the database.', ephemeral: true });
            }

            if (topic) {
                db.all(`SELECT rowid, explanation, author, upvotes FROM explanations WHERE topic_id = ?`, [topic.id], async (err, rows) => {
                    if (err) {
                        console.error('Error fetching explanations:', err);
                        return interaction.reply({ content: 'An error occurred while fetching explanations.', ephemeral: true });
                    }

                    if (rows.length > 0) {
                        let index = 0;

                        const updateEmbed = () => {
                            const explanation = rows[index].explanation;
                            const author = rows[index].author;
                            const upvotes = rows[index].upvotes;
                            return new EmbedBuilder()
                                .setColor('#76aedb')
                                .setTitle(topicName)
                                .setDescription(explanation)
                                .setFooter({ text: `Made by ${author} | Upvotes: ${upvotes}` });
                        };

                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('back').setLabel('⏪').setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId('upvote').setLabel('🔼').setStyle(ButtonStyle.Success),
                                new ButtonBuilder().setCustomId('forward').setLabel('⏩').setStyle(ButtonStyle.Primary)
                            );

                        const message = await interaction.reply({ embeds: [updateEmbed()], components: [row], fetchReply: true });

                        const collector = message.createMessageComponentCollector();

                        collector.on('collect', async i => {
                            if (i.customId === 'back') {
                                if (index > 0) index--;
                            } else if (i.customId === 'forward') {
                                if (index < rows.length - 1) index++;
                            } else if (i.customId === 'upvote') {
                                const rowid = rows[index].rowid;
                                db.run(`UPDATE explanations SET upvotes = upvotes + 1 WHERE rowid = ?`, [rowid], (err) => {
                                    if (err) {
                                        console.error('Error updating upvotes:', err);
                                    }
                                });
                                rows[index].upvotes += 1; // Increment in the local array
                            }

                            await i.update({ embeds: [updateEmbed()] });
                        });
                    } else {
                        await interaction.reply({ content: 'No explanations found for this topic.', ephemeral: true });
                    }
                });
            } else {
                interaction.reply({ content: `The topic "${topicName}" does not exist.`, ephemeral: true });
            }
        });
    }
});

// React to messages in a specific channel
client.on('messageCreate', message => {
    if (message.channel.id === process.env.CHANNEL_ID) {
        message.react('✔️');
    }
});

// Map to store ongoing Pomodoro sessions
client.pomodoroSessions = new Map();

// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);
