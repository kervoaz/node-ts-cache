import * as Lodash from "lodash";
import { IStorage } from '../storages/IStorage';
import { AbstractBaseStrategy } from './AbstractBaseStrategy';

interface IExpiringCacheItem {
    content: any;
    meta: {
        createdAt: number;
        ttl: number;
    }
}

interface IOptions {
    ttl?: number;
    isLazy?: boolean;
}

export class ExpirationStrategy extends AbstractBaseStrategy {

    constructor(storage: IStorage) {
        super(storage);
    }

    public async getItem<T>(key: string): Promise<T> {
        const item = await this.storage.getItem<IExpiringCacheItem>(key);
        if (item && this.isItemExpired(item)) {
            await this.storage.setItem(key, undefined);
            return undefined;
        }
        return item ? item.content : undefined;
    }
    
    public async setItem(key: string, content: any, options: IOptions): Promise<void> {
        options = Lodash.merge({ ttl: 60, isLazy: true }, options);

        if (!options.isLazy) {
            setTimeout(() => {
                this.unsetKey(key);
            }, options.ttl);
        }
        await this.storage.setItem(key, {
            meta: {
                ttl: options.ttl * 1000,
                createdAt: Date.now()
            },
            content: content
        });
    }

    public async clear(): Promise<void> {
        this.storage.clear();
    }

    private isItemExpired(item: IExpiringCacheItem): boolean {
        return Date.now() > item.meta.createdAt + item.meta.ttl;
    }
    private async unsetKey(key: string): Promise<void> {
        await this.storage.setItem(key, undefined);
    }
}