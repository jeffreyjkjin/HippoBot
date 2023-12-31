import { ChannelType, ChatInputCommandInteraction, InteractionReplyOptions, InteractionResponse } from 'discord.js'
import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders'

import eventEmbed from '../embeds/eventembed'
import messageEmbed from '../embeds/messageembed'
import EventData from '../interfaces/EventData'
import Command from '../structures/Command'
import ExtendedClient from '../structures/ExtendedClient'
import eventModal from '../utils/eventmodal'
import checkImage from '../utils/checkimage'
import parseDate from '../utils/parsedate'

module.exports = new Command(
    new SlashCommandBuilder()
        .setName('event')
        .setDescription('Creates a new event.')
        .addStringOption((option: SlashCommandStringOption) => {
            return option
                .setName('title')
                .setDescription('What is your event called? (i.e., My awesome event)')
                .setMaxLength(256);
        })
        .addStringOption((option: SlashCommandStringOption) => {
            return option
                .setName('datetime')
                .setDescription('When is your event? (i.e., October 2, 2023 10:00 PM PST)');
            })
        .addStringOption((option: SlashCommandStringOption) => {
            return option
            .setName('description')
            .setDescription('What is your event about? (i.e., An epic event for epic gamers.)')
            .setMaxLength(3072);
        })
        .addStringOption((option: SlashCommandStringOption) => {
            return option
                .setName('image')
                .setDescription('Add an image to your event. (i.e., https://i.imgur.com/w8as1S9.png)');
        }),
    /*
         DESC: Allows user to create an event using command arguments. 
          PRE: Arguments passed to this command are valid.
        PARAM: i - Interaction from command call.
         POST: A new event is added to db and an embed display this event is posted.
    */
    async (i: ChatInputCommandInteraction) => {
        // only allow use of this command in regular text channels in guild
        if (!i.channel) {
            await i.reply(messageEmbed(
                'This command can only be used in a server.'
            ) as InteractionReplyOptions);
            return;
        }

        if (i.channel.type !== ChannelType.GuildText) {
            await i.reply(messageEmbed(
                'This command can only be used in a regular text channel.'
            ) as InteractionReplyOptions);
            return;
        }

        // create event with command arguments
        const event: EventData = {
            title: i.options.getString('title'),
            description: i.options.getString('description'),
            datetime: i.options.getString('datetime'),
            attendees: [] as string[],
            maybe: [] as string[],
            pass: [] as string[],
            image: i.options.getString('image'),
            channelId: i.channelId,
            messageUrl: null,
            creatorId: i.user.id,
            started: false
        }
        
        // display modal if not all required fields were given
        if (!event.title || !event.datetime) {
            await i.showModal(eventModal('createevent', event));
            return;
        }

        // check if time is valid
        try {
            event.datetime = parseDate(event.datetime);
        }
        catch (e: any) {
            i.reply(messageEmbed(e.toString()) as InteractionReplyOptions);
            return;
        }

        // check if image is valid
        if (event.image) {
            try {
                checkImage(event.image);
            }
            catch (e: any) {
                i.reply(messageEmbed(e.toString()) as InteractionReplyOptions);
                return;
            }
        }

        // insert event into db and create event embed post
        const client: ExtendedClient = i.client as ExtendedClient;
        try {
            const message: InteractionResponse = await i.reply(eventEmbed(i, event) as InteractionReplyOptions);
            event.messageUrl = (await message.fetch()).url;

            await client.mongo.db('Events').collection<EventData>(i.guild.id).insertOne(event);
        }
        catch (e: any) {
            await i.reply(messageEmbed(
                'This event could not be created.'
            ) as InteractionReplyOptions);
        }
    }
);