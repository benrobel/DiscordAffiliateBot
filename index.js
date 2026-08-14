const { Client, GatewayIntentBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] });

const AFFILIATE_ROLE_ID = process.env.AFFILIATE_ROLE_ID;
const ACCEPTANCE_LOG_CHANNEL = process.env.ACCEPTANCE_LOG_CHANNEL;

const AGREEMENT_TEXT = `
**AFFILIATE AGREEMENT**

By accepting this agreement, you confirm that you:

✅ Understand our affiliate commission structure
✅ Will not engage in prohibited marketing (spam, misleading claims, false advertising)
✅ Will follow all FTC/CFTA disclosure requirements
✅ Accept our Terms of Service and Privacy Policy
✅ Agree to represent the brand honestly and professionally

Violations may result in removal from the program.

Type "I ACCEPT" in the field below to confirm.
`;

client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  
  if (!guild) {
    console.error('❌ Guild not found');
    return;
  }

  const command = new SlashCommandBuilder()
    .setName('setup-agreement')
    .setDescription('Post the agreement acceptance button');

  try {
    await guild.commands.create(command);
    console.log('✅ Slash command registered');
  } catch (error) {
    console.error('Error:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand() && interaction.commandName === 'setup-agreement') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ Only admins can use this', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Affiliate Agreement')
      .setDescription(AGREEMENT_TEXT);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_agreement')
          .setLabel('Accept Agreement')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Posted', ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'accept_agreement') {
    const modal = new ModalBuilder()
      .setCustomId('agreement_modal')
      .setTitle('Affiliate Agreement Acceptance');

    const acceptanceInput = new TextInputBuilder()
      .setCustomId('acceptance_text')
      .setLabel('Type "I ACCEPT" to confirm')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(acceptanceInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'agreement_modal') {
    const userInput = interaction.fields.getTextInputValue('acceptance_text').trim().toUpperCase();

    if (userInput !== 'I ACCEPT') {
      return interaction.reply({ content: '❌ Type exactly "I ACCEPT"', ephemeral: true });
    }

    try {
      const member = interaction.member;
      const affiliateRole = interaction.guild.roles.cache.get(AFFILIATE_ROLE_ID);

      if (!affiliateRole) {
        return interaction.reply({ content: '❌ Role not found', ephemeral: true });
      }

      await member.roles.add(affiliateRole);

      const logChannel = client.channels.cache.get(ACCEPTANCE_LOG_CHANNEL);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor('#00aa00')
          .setTitle('✅ Agreement Accepted')
