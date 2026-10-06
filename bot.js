// 1. Mandatory HTTP server for Render health checks and UptimeRobot pings
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Movie Night Bot is alive and running 24/7!');
});
server.listen(process.env.PORT || 3000);

// 2. Discord.js client setup
const { 
    Client, 
    GatewayIntentBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Store current movie session data in memory
let currentMovie = {
    title: "No movie set yet",
    url: "N/A",
    time: "N/A",
    host: "None"
};

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('movienight')
        .setDescription('Configure a movie night session (Host Only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set up a new movie session')
        ),
    new SlashCommandBuilder()
        .setName('movie')
        .setDescription('Movie night information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View the current movie night details')
        )
].map(command => command.toJSON());

// Register slash commands when bot comes online
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// Handle interactions (Slash commands and Modals)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        // /movienight set command
        if (commandName === 'movienight' && options.getSubcommand() === 'set') {
            // Check if user is authorized host
            if (interaction.user.id !== process.env.AUTHORIZED_USER_ID) {
                return interaction.reply({ content: '❌ Only the designated host can configure movie nights.', ephemeral: true });
            }

            // Create Modal for movie configuration
            const modal = new ModalBuilder()
                .setCustomId('movieModal')
                .setTitle('Configure Movie Night');

            const titleInput = new TextInputBuilder()
                .setCustomId('movieTitle')
                .setLabel('Movie Title')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const urlInput = new TextInputBuilder()
                .setCustomId('movieUrl')
                .setLabel('Stream URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const timeInput = new TextInputBuilder()
                .setCustomId('movieTime')
                .setLabel('Start Time')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(urlInput),
                new ActionRowBuilder().addComponents(timeInput)
            );

            await interaction.showModal(modal);
        }

        // /movie info command (Reverted to your original layout)
        if (commandName === 'movie' && options.getSubcommand() === 'info') {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🎬 Upcoming Movie Night')
                .setDescription(`**Movie:** ${currentMovie.title}\n**Start Time:** ${currentMovie.time}\n**Stream Link:** ${currentMovie.url}\n**Host:** ${currentMovie.host}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    } 
    // Handle Modal Submission
    else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'movieModal') {
            currentMovie.title = interaction.fields.getTextInputValue('movieTitle');
            currentMovie.url = interaction.fields.getTextInputValue('movieUrl');
            currentMovie.time = interaction.fields.getTextInputValue('movieTime');
            currentMovie.host = interaction.user.tag;

            await interaction.reply({ content: `✅ Movie night successfully updated to: **${currentMovie.title}**!`, ephemeral: true });
        }
    }
});

// Log in using environment token
client.login(process.env.TOKEN);
