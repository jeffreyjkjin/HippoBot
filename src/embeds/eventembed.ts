import { BaseInteraction, Colors, EmbedBuilder, MessageCreateOptions, userMention } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders'

import EventData from '../interfaces/EventData'

/*
     DESC: Creates formatted string of user mentions.
      PRE: All ids are valid.
    PARAM: ids - An array of Discord ids.
      POST: Returns formatted string.
*/
const printNames = (ids: string[]): string => {
    let names: string = '';
    ids.forEach((id: string) => {
        const user: string = `> ${userMention(id)}`;
        // only 768 characters allowed for each attendee, maybe, and pass fields
        if (names.length + user.length + 2 <= 768) {
            names += '\n' + user;
        }
    });

    return names ? names : '> -';
}

/*
     DESC: Displays event information to user with interactive attendance buttons.
      PRE: The event is valid.
    PARAM: i - Generic interaction.
    PARAM: event - Data from the event.
     POST: Returns embed.
*/
const eventEmbed = (i: BaseInteraction, event: EventData): MessageCreateOptions => {
    const embed: EmbedBuilder = new EmbedBuilder()
        .setTitle(`:calendar_spiral: **${event.title}**`)
        .setColor(Colors.Green)
        .setDescription(event.description ? event.description : null)
        .addFields(
            { 
                name: 'Time', 
                value: `<t:${Date.parse(event.datetime)/1000}> (<t:${Date.parse(event.datetime)/1000}:R>)`
            },
            {
                name: `:white_check_mark: Attendees (${event.attendees.length})`,
                value: printNames(event.attendees),
                inline: true
            },
            {
                name: `:person_shrugging: Maybe (${event.maybe.length})`,
                value: printNames(event.maybe),
                inline: true
            },
            {
                name: `:x: Pass (${event.pass.length})`,
                value: printNames(event.pass),
                inline: true
            }
        )
        .setImage(event.image ? event.image : null)
        .setFooter({ text: `⚙️ Settings | Created by ${i.client.users.cache.get(event.creatorId).globalName}` });

    const buttons: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
    
    // only show buttons if event has not started
    if (!event.started) {
        buttons.addComponents(
            require('../buttons/attend'), 
            require('../buttons/maybe'), 
            require('../buttons/pass'),
        );
    }
    buttons.addComponents(require('../buttons/eventsettings'));

    return {
        embeds: [embed],
        components: [buttons]
    } as MessageCreateOptions;
}

export default eventEmbed;