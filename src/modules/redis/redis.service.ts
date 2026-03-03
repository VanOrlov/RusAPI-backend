import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { UAParser } from 'ua-parser-js';

export interface RedisSessionData {
  sessionId: string;
  refreshTokenHash: string;
  ip: string;
  device: string;
  createdAt: string;
  lastActive: string;
}

export type RedisAllSessions = Omit<RedisSessionData, 'refreshTokenHash'>;

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async createSession(
    userId: string,
    sessionId: string,
    refreshTokenHash: string,
    ip: string,
    userAgent: string,
    expiresInSec: number,
  ) {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const deviceName = `${browser.name || 'Неизвестный браузер'} на ${os.name || 'Неизвестной ОС'}`;

    // Типизируем создаваемый объект
    const sessionData: RedisSessionData = {
      sessionId,
      refreshTokenHash,
      ip,
      device: deviceName,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    await this.redisClient.set(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      expiresInSec,
    );
    await this.redisClient.sadd(`user_sessions:${userId}`, sessionId);
  }

  async getSession(sessionId: string): Promise<RedisSessionData | null> {
    const data = (await this.redisClient.get(`session:${sessionId}`)) as
      | string
      | null;
    if (!data) return null;

    // Приводим результат JSON.parse к нашему типу
    return JSON.parse(data) as RedisSessionData;
  }

  async updateSession(sessionId: string, newHash: string) {
    const sessionStr = (await this.redisClient.get(`session:${sessionId}`)) as
      | string
      | null;
    if (sessionStr) {
      const expiresInSec = 7 * 24 * 60 * 60;
      const sessionData = JSON.parse(sessionStr) as RedisSessionData;
      sessionData.refreshTokenHash = newHash;
      sessionData.lastActive = new Date().toISOString();

      await this.redisClient.set(
        `session:${sessionId}`,
        JSON.stringify(sessionData),
        'EX',
        expiresInSec,
      );
    }
  }

  async updateSessionLastActive(sessionId: string) {
    const sessionStr = (await this.redisClient.get(`session:${sessionId}`)) as
      | string
      | null;
    if (sessionStr) {
      const expiresInSec = 7 * 24 * 60 * 60;
      const sessionData = JSON.parse(sessionStr) as RedisSessionData;
      sessionData.lastActive = new Date().toISOString();

      await this.redisClient.set(
        `session:${sessionId}`,
        JSON.stringify(sessionData),
        'EX',
        expiresInSec,
      );
      return true;
    } else {
      return false;
    }
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.redisClient.del(`session:${sessionId}`);
    await this.redisClient.srem(`user_sessions:${userId}`, sessionId);
  }

  async getAllUserSessions(
    userId: string,
  ): Promise<Omit<RedisSessionData, 'refreshTokenHash'>[]> {
    const sessionIds = (await this.redisClient.smembers(
      `user_sessions:${userId}`,
    )) as string[];
    const activeSessions: RedisAllSessions[] = [];

    for (const id of sessionIds) {
      const sessionStr = (await this.redisClient.get(
        `session:${id}`,
      )) as string;
      if (sessionStr) {
        const sessionData = JSON.parse(sessionStr) as RedisSessionData;

        const { refreshTokenHash, ...safeSessionData } = sessionData;
        activeSessions.push(safeSessionData);
      } else {
        await this.redisClient.srem(`user_sessions:${userId}`, id);
      }
    }

    return activeSessions;
  }
}
