import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseError } from 'firebase-admin/lib/firebase-namespace-api';
import { LogService } from '../log/log.service';
import { CACHE_KEYS, CacheTTL } from '../../cache';
import { Cache } from 'cache-manager';
import { API_CONFIG } from '../../constants';
import { Environment } from '@seed/shared/types';

@Injectable()
export class FirebaseAuthService {
  logService = new LogService(FirebaseAuthService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    if (!admin.apps.length) {
      admin.initializeApp(
        API_CONFIG.environment === Environment.production ? undefined : { projectId: API_CONFIG.projectId },
      );
    }
  }

  async getUser(userId: string): Promise<null | admin.auth.UserRecord> {
    try {
      return await this.getAuth().getUser(userId);
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      if (firebaseError.code && firebaseError.code === `auth/user-not-found`) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Validates token and returns userId or null (if token is not valid or outdated).
   * @param token JWT
   */
  async validateJWT(token: string): Promise<null | string> {
    const logSegment = this.logService.startSegment(this.validateJWT.name, { token });
    try {
      let fromCache = true;
      const cacheKey = CACHE_KEYS.jwt(token);
      const ttl = CacheTTL.oneHour;
      const cacheFunction = async (): Promise<null | string> => {
        fromCache = false;
        const decodedToken = await this.getAuth().verifyIdToken(token, true);
        return decodedToken.uid || null;
      };
      const userId = await this.cache.wrap<null | string>(cacheKey, cacheFunction, ttl);

      logSegment.endWithSuccess({
        fromCache,
        userId,
      });
      return userId;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logSegment.endWithFail(error, {
          token,
        });
      }
      return null;
    }
  }

  async blockUser(userId: string): Promise<void> {
    await this.getAuth().updateUser(userId, { disabled: true });
  }

  async unblockUser(userId: string): Promise<void> {
    await this.getAuth().updateUser(userId, { disabled: false });
  }

  async updateCustomClaims(userId: string, customClaims: { [field: string]: unknown }): Promise<void> {
    return this.logService.trackSegment<void>(this.updateCustomClaims.name, async logSegment => {
      const userRecord = await this.getAuth().getUser(userId);
      const oldClaims = userRecord.customClaims;
      const newClaims = { ...oldClaims, ...customClaims };
      logSegment.log(`Intermediate log`, { oldClaims, newClaims });
      return this.getAuth().setCustomUserClaims(userId, newClaims);
    });
  }

  private getAuth(): admin.auth.Auth {
    return admin.auth();
  }
}
