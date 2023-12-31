import { InteractionReplyOptions, Message, MessageEditOptions, ModalSubmitInteraction, User } from 'discord.js'

import editEventEmbed from '../embeds/editeventembed'
import eventEmbed from '../embeds/eventembed'
import messageEmbed from '../embeds/messageembed'
import EventData from '../interfaces/EventData'
import ExtendedClient from '../structures/ExtendedClient'
import Modal from '../structures/Modal'
import checkImage from '../utils/checkimage'
import eventModal from '../utils/eventmodal'
import parseDate from '../utils/parsedate'

module.exports = new Modal(
    eventModal('editevent'),
    /*
         DESC: Updates the event using the data gathered from the modal. 
          PRE: The event being edited is valid and exists.
        PARAM: i - Interaction from modal submission.
         POST: Both the events fields in the db and it's embed post are updated.
    */
    async (i: ModalSubmitInteraction) => {
        const client: ExtendedClient = i.client as ExtendedClient;

        const title: string = i.fields.getTextInputValue('title');
        const description: string = i.fields.getTextInputValue('description');
        const datetime: string = i.fields.getTextInputValue('datetime');
        const image: string = i.fields.getTextInputValue('image');
        
        let parsedDatetime: string;
        // check if time is valid
        try {
            parsedDatetime = parseDate(datetime);
        }
        catch (e: any) {
            i.reply(messageEmbed(e.toString()) as InteractionReplyOptions);
            return;
        }

        // check if image is valid
        if (image) {
            try {
                checkImage(image);
            }
            catch (e: any) {
                i.reply(messageEmbed(e.toString()) as InteractionReplyOptions);
                return;
            }
        }
        
        try {
            // update event
            const event: EventData = await client.mongo.db('EditEvent').collection<EventData>(i.user.id).findOne({});
            await client.mongo.db('Events').collection<EventData>(i.guild.id).updateOne(
                { messageUrl: event.messageUrl },
                {
                    $set: {
                        title: title,
                        description: description,
                        datetime: parsedDatetime,
                        image: image
                    }
                }
            );

            // delete event from user's EditEvent collection
            await client.mongo.db('EditEvent').collection<EventData>(i.user.id).deleteMany({});

            // update event post
            const updatedEvent: EventData = await client.mongo.db('Events').collection<EventData>(i.guild.id).findOne(
                { messageUrl: event.messageUrl }
            );

            const eventPost: Message = await i.channel.messages.fetch(event.messageUrl.split('/').at(-1));
            await eventPost.edit(eventEmbed(i, updatedEvent) as MessageEditOptions);
            
            await i.reply(messageEmbed(
                `[**${updatedEvent.title}**](${updatedEvent.messageUrl}) has been updated.`
            ) as InteractionReplyOptions);

            // dm attendees that event has been edited
            updatedEvent.attendees.forEach(async (id: string) => {
                const attendee: User = await client.users.fetch(id);
                await attendee.send(editEventEmbed(i, event, updatedEvent));
            });
        }
        catch (e: any) {
            await i.reply(messageEmbed(
                `This event could not be updated.`
            ) as InteractionReplyOptions);
        }
    }
);