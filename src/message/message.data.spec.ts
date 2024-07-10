import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { MessageData } from './message.data';
import { ChatMessageModel, ChatMessageSchema } from './models/message.model';

import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { getTestConfiguration } from '../configuration/configuration-manager.utils';

const id = new ObjectID('5fe0cce861c8ea54018385af');
const conversationId = new ObjectID();
const senderId = new ObjectID('5fe0cce861c8ea54018385af');
const sender2Id = new ObjectID('5fe0cce861c8ea54018385aa');
const sender3Id = new ObjectID('5fe0cce861c8ea54018385ab');

class TestMessageData extends MessageData {
  async deleteMany() {
    await this.chatMessageModel.deleteMany();
  }
}

describe('MessageData', () => {
  let messageData: TestMessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          useFactory: () => {
            const databaseConfig = getTestConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [TestMessageData],
    }).compile();

    messageData = module.get<TestMessageData>(TestMessageData);
  });

  beforeEach(async () => {
    messageData.deleteMany();
  });

  afterEach(async () => {
    messageData.deleteMany();
  });

  it('should be defined', () => {
    expect(messageData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(messageData.create).toBeDefined();
    });

    it('successfully creates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      expect(message).toMatchObject({
        likes: [],
        resolved: false,
        deleted: false,
        reactions: [],
        text: 'Hello world',
        senderId: senderId,
        conversationId: conversationId,
        conversation: { id: conversationId.toHexString() },
        likesCount: 0,
        sender: { id: senderId.toHexString() },
      });
    });
  });

  describe('get', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const gotMessage = await messageData.getMessage(
        sentMessage.id.toHexString(),
      );

      expect(gotMessage).toMatchObject(sentMessage);
    });
  });

  describe('delete', () => {
    it('successfully marks a message as deleted', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to delete' },
        senderId,
      );

      // Make sure that it started off as not deleted
      expect(message.deleted).toEqual(false);

      // And that is it now deleted
      const deletedMessage = await messageData.delete(new ObjectID(message.id));
      expect(deletedMessage.deleted).toEqual(true);
    });
  });

  describe('addTag', () => {
    it('successfully adds a tag to a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Add tag to message', tags: [''] },
        senderId,
      );

      const messageId = new ObjectID(message.id);
      const tag = 'Urgent';

      const taggedMessage = await messageData.addTag(messageId, senderId, tag);
      expect(taggedMessage.tags).toContain(tag);
    });
  });

  describe('updateTag', () => {
    it('successfully updates a specific tag within a message', async () => {
      const tags = ['Urgent', 'Normal'];
      const conversationId = new ObjectID();
      const message = await messageData.create(
        {
          conversationId,
          text: 'Update a specific tag in message',
          tags: tags,
        },

        senderId,
      );

      const messageId = new ObjectID(message.id);

      const oldTag = tags[0];
      const newTag = 'Severe';
      // Update the tag 'Urgent' to 'Severe'
      const taggedMessage = await messageData.updateTag(
        messageId,
        senderId,
        oldTag,
        newTag,
      );

      expect(taggedMessage.tags).toContain(newTag);
    });
  });

  describe('getMessagesByTag', () => {
    it('successfully gets all messages filtered by specific tag', async () => {
      const conversationId = new ObjectID();
      await messageData.create(
        {
          conversationId,
          text: 'Add tag to message1',
          tags: ['Urgent', 'Severe'],
        },
        senderId,
      );

      await messageData.create(
        {
          conversationId,
          text: 'Add tag to message2',
          tags: ['Urgent', 'Low'],
        },
        senderId,
      );

      await messageData.create(
        { conversationId, text: 'Add tag to message3', tags: ['High', 'Low'] },
        senderId,
      );

      const tag = 'Urgent';

      const listTaggedMessages = await messageData.getMessagesByTag(
        tag,
        senderId,
      );
      expect(listTaggedMessages.length).toEqual(2);
    });
  });
});
