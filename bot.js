const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const AUTHORIZED_USER_ID = process.env.AUTHORIZED_USER_ID;

// Store the latest movie configuration globally so anyone can fetch it via /movie info
let activeMovie = null;

client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
            body: [
                new SlashCommandBuilder()
                    .setName('movienight')
                    .setDescription('Configure a movie night session (Host Only)')
                    .toJSON(),
                new SlashCommandBuilder()
                    .setName('movie')
                    .setDescription('Movie night options')
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('info')
                            .setDescription('Get the current movie night details and stream link')
                    )
                    .toJSON()
            ],
        });
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isModalSubmit()) return;

    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        
        // Handle /movienight (Host Only)
        if (interaction.commandName === 'movienight') {
            if (interaction.user.id !== AUTHORIZED_USER_ID) {
                return interaction.reply({
                    content: `❌ <@${interaction.user.id}>, only the designated host is allowed to configure Movie Night! Use \`/movie info\` to view the active movie.`,
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('movieModal')
                .setTitle('Configure Movie Night');

            const nameInput = new TextInputBuilder()
                .setCustomId('movieNameInput')
                .setLabel('Movie Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., Interstellar')
                .setRequired(true);

            const instructionsInput = new TextInputBuilder()
                .setCustomId('instructionsInput')
                .setLabel('Custom Instructions')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter instructions here...')
                .setRequired(true);

            const urlInput = new TextInputBuilder()
                .setCustomId('movieUrlInput')
                .setLabel('Direct Movie / Stream Link')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Paste your link here')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(instructionsInput),
                new ActionRowBuilder().addComponents(urlInput)
            );

            await interaction.showModal(modal);
        }

        // Handle /movie info (Available to everyone)
        if (interaction.commandName === 'movie') {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'info') {
                if (!activeMovie) {
                    return interaction.reply({
                        content: '🍿 There is no active movie night set up yet! Ask the host to configure one first.',
                        ephemeral: true
                    });
                }

                try {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Open Stream Link')
                            .setURL(activeMovie.url)
                            .setStyle(ButtonStyle.Link)
                    );

                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(`🍿 Movie Night: ${activeMovie.name}`)
                        .setDescription('Here is the current movie night info you requested!')
                        .addFields(
                            { name: '📖 Instructions', value: activeMovie.instructions }
                        )
                        .setFooter({ text: 'Server Movie Night Hub' });

                    await interaction.reply({ embeds: [embed], components: [row] });
                } catch (error) {
                    console.error('Error handling /movie info command:', error);
                }
            }
        }
    }

    // 2. Handle Modal Submission from Host
    if (interaction.isModalSubmit() && interaction.customId === 'movieModal') {
        const movieName = interaction.fields.getTextInputValue('movieNameInput');
        const customInstructions = interaction.fields.getTextInputValue('instructionsInput');
        const movieUrl = interaction.fields.getTextInputValue('movieUrlInput');

        try {
            // Save movie details globally so /movie info can pull it up anytime
            activeMovie = {
                name: movieName,
                instructions: customInstructions,
                url: movieUrl
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open Stream Link')
                    .setURL(movieUrl)
                    .setStyle(ButtonStyle.Link)
            );

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🍿 Movie Night: ${movieName}`)
                .setDescription('Grab your snacks and get comfortable! Click the button below to join the stream.')
                .addFields(
                    { name: '📖 Instructions', value: customInstructions }
                )
                .setFooter({ text: 'Server Movie Night Hub' });

            // Post initial announcement to the channel
            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            await interaction.reply({ 
                content: '⚠️ **Invalid Link Provided!** Please make sure your stream link starts with `https://`.', 
                ephemeral: true 
            });
        }
    }
});

client.login(TOKEN);