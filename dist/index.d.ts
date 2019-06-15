/// <reference types="node" />
import { Response } from 'got';
import { AllClientData, NormalizedTorrent, TorrentClient, TorrentSettings, AddTorrentOptions as NormalizedAddTorrentOptions } from '@ctrl/shared-torrent';
import { AddTorrentOptions, Torrent, TorrentFile, TorrentFilePriority, TorrentFilters, TorrentPieceState, TorrentProperties, TorrentTrackers, WebSeed } from './types';
export declare class QBittorrent implements TorrentClient {
    config: TorrentSettings;
    /**
     * auth cookie
     */
    private _sid?;
    constructor(options?: Partial<TorrentSettings>);
    /**
     * Get application version
     */
    version(): Promise<string>;
    getTorrent(hash: string): Promise<NormalizedTorrent>;
    /**
     * Torrents list
     * @param hashes Filter by torrent hashes
     * @param [filter] Filter torrent list
     * @param category Get torrents with the given category (empty string means "without category"; no "category" parameter means "any category")
     * @returns list of torrents
     */
    listTorrents(hashes?: string | string[], filter?: TorrentFilters, category?: string, limit?: number, offset?: number, sort?: string, reverse?: boolean): Promise<Torrent[]>;
    getAllData(): Promise<AllClientData>;
    torrentProperties(hash: string): Promise<TorrentProperties>;
    torrentTrackers(hash: string): Promise<TorrentTrackers[]>;
    torrentWebSeeds(hash: string): Promise<WebSeed[]>;
    torrentFiles(hash: string): Promise<TorrentFile[]>;
    setFilePriority(hash: string, fileIds: string | string[], priority: TorrentFilePriority): Promise<TorrentFile[]>;
    torrentPieceStates(hash: string): Promise<TorrentPieceState[]>;
    /**
     * Torrents piece hashes
     * @returns an array of hashes (strings) of all pieces (in order) of a specific torrent
     */
    torrentPieceHashes(hash: string): Promise<string[]>;
    setTorrentLocation(hashes: string | string[] | 'all', location: string): Promise<boolean>;
    setTorrentName(hashes: string | string[] | 'all', name: string): Promise<boolean>;
    createCategory(category: string): Promise<boolean>;
    removeCategory(category: string): Promise<boolean>;
    setTorrentCategory(hashes: string | string[] | 'all', category: string): Promise<boolean>;
    pauseTorrent(hashes: string | string[] | 'all'): Promise<boolean>;
    resumeTorrent(hashes: string | string[] | 'all'): Promise<boolean>;
    /**
     * @link https://github.com/qbittorrent/qBittorrent/wiki/Web-API-Documentation#delete-torrents
     */
    removeTorrent(hashes: string | string[] | 'all', deleteFiles?: boolean): Promise<boolean>;
    recheckTorrent(hashes: string | string[] | 'all'): Promise<boolean>;
    reannounceTorrent(hashes: string | string[] | 'all'): Promise<boolean>;
    addTorrent(torrent: string | Buffer, options?: Partial<AddTorrentOptions>): Promise<boolean>;
    normalizedAddTorrent(torrent: string | Buffer, options?: Partial<NormalizedAddTorrentOptions>): Promise<NormalizedTorrent>;
    addTrackers(hash: string, urls: string): Promise<boolean>;
    editTrackers(hash: string, origUrl: string, newUrl: string): Promise<boolean>;
    removeTrackers(hash: string, urls: string): Promise<boolean>;
    queueUp(hashes: string | string[] | 'all'): Promise<boolean>;
    queueDown(hashes: string | string[] | 'all'): Promise<boolean>;
    topPriority(hashes: string | string[] | 'all'): Promise<boolean>;
    bottomPriority(hashes: string | string[] | 'all'): Promise<boolean>;
    login(): Promise<boolean>;
    logout(): boolean;
    request<T extends object | string>(path: string, method: string, params?: any, body?: any, headers?: any, json?: boolean): Promise<Response<T>>;
    /**
     * Normalizes hashes
     * @returns hashes as string seperated by `|`
     */
    private _normalizeHashes;
    private _normalizeTorrentData;
}
