"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const got_1 = __importDefault(require("got"));
const tough_cookie_1 = require("tough-cookie");
const url_join_1 = __importDefault(require("url-join"));
const torrent_file_1 = require("@ctrl/torrent-file");
const shared_torrent_1 = require("@ctrl/shared-torrent");
const types_1 = require("./types");
const defaults = {
    baseUrl: 'http://localhost:9091/',
    path: '/api/v2',
    username: '',
    password: '',
    timeout: 5000,
};
class QBittorrent {
    constructor(options = {}) {
        this.config = Object.assign({}, defaults, options);
    }
    /**
     * Get application version
     */
    async version() {
        const res = await this.request('/app/version', 'GET', undefined, undefined, undefined, false);
        return res.body;
    }
    async getTorrent(hash) {
        const torrentsResponse = await this.listTorrents(hash);
        const torrentData = torrentsResponse[0];
        if (!torrentData) {
            throw new Error('Torrent not found');
        }
        return this._normalizeTorrentData(torrentData);
    }
    /**
     * Torrents list
     * @param hashes Filter by torrent hashes
     * @param [filter] Filter torrent list
     * @param category Get torrents with the given category (empty string means "without category"; no "category" parameter means "any category")
     * @returns list of torrents
     */
    async listTorrents(hashes, filter, category) {
        const params = {};
        if (hashes) {
            params.hashes = this._normalizeHashes(hashes);
        }
        if (filter) {
            params.filter = filter;
        }
        if (category) {
            params.category = category;
        }
        const res = await this.request('/torrents/info', 'GET', params);
        return res.body;
    }
    async getAllData() {
        const listTorrents = await this.listTorrents();
        const results = {
            torrents: [],
            labels: [],
        };
        const labels = {};
        for (const torrent of listTorrents) {
            const torrentData = this._normalizeTorrentData(torrent);
            results.torrents.push(torrentData);
            // setup label
            if (torrentData.label) {
                if (labels[torrentData.label] === undefined) {
                    labels[torrentData.label] = {
                        id: torrentData.label,
                        name: torrentData.label,
                        count: 1,
                    };
                }
                else {
                    labels[torrentData.label].count += 1;
                }
            }
        }
        return results;
    }
    async torrentProperties(hash) {
        const res = await this.request('/torrents/properties', 'GET', { hash });
        return res.body;
    }
    async torrentTrackers(hash) {
        const res = await this.request('/torrents/trackers', 'GET', { hash });
        return res.body;
    }
    async torrentWebSeeds(hash) {
        const res = await this.request('/torrents/webseeds', 'GET', { hash });
        return res.body;
    }
    async torrentFiles(hash) {
        const res = await this.request('/torrents/files', 'GET', { hash });
        return res.body;
    }
    async setFilePriority(hash, fileIds, priority) {
        const res = await this.request('/torrents/filePrio', 'GET', {
            hash,
            id: this._normalizeHashes(fileIds),
            priority,
        });
        return res.body;
    }
    async torrentPieceStates(hash) {
        const res = await this.request('/torrents/pieceStates', 'GET', { hash });
        return res.body;
    }
    /**
     * Torrents piece hashes
     * @returns an array of hashes (strings) of all pieces (in order) of a specific torrent
     */
    async torrentPieceHashes(hash) {
        const res = await this.request('/torrents/pieceHashes', 'GET', { hash });
        return res.body;
    }
    async setTorrentLocation(hashes, location) {
        const body = {
            hashes: this._normalizeHashes(hashes),
            location,
        };
        await this.request('/torrents/setLocation', 'POST', undefined, body);
        return true;
    }
    async setTorrentName(hashes, name) {
        const body = {
            hashes: this._normalizeHashes(hashes),
            name,
        };
        await this.request('/torrents/rename', 'POST', undefined, body);
        return true;
    }
    async createCategory(category) {
        const body = {
            category,
        };
        await this.request('/torrents/createCategory', 'POST', undefined, body);
        return true;
    }
    async removeCategory(category) {
        const body = {
            category,
        };
        await this.request('/torrents/removeCategories', 'POST', undefined, body);
        return true;
    }
    async setTorrentCategory(hashes, category) {
        const body = {
            hashes: this._normalizeHashes(hashes),
            category,
        };
        await this.request('/torrents/setCategory', 'POST', undefined, body);
        return true;
    }
    async pauseTorrent(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/pause', 'GET', params);
        return true;
    }
    async resumeTorrent(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/resume', 'GET', params);
        return true;
    }
    /**
     * @link https://github.com/qbittorrent/qBittorrent/wiki/Web-API-Documentation#delete-torrents
     */
    async removeTorrent(hashes, deleteFiles = true) {
        const params = {
            hashes: this._normalizeHashes(hashes),
            deleteFiles,
        };
        await this.request('/torrents/delete', 'GET', params);
        return true;
    }
    async recheckTorrent(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/recheck', 'GET', params);
        return true;
    }
    async reannounceTorrent(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/reannounce', 'GET', params);
        return true;
    }
    async addTorrent(torrent, options = {}) {
        const form = new form_data_1.default();
        const fileOptions = {
            contentType: 'application/x-bittorrent',
            filename: options.filename || 'torrent',
        };
        // remove options.filename, not used in form
        if (options.filename) {
            delete options.filename;
        }
        if (typeof torrent === 'string') {
            if (fs_1.default.existsSync(torrent)) {
                form.append('file', Buffer.from(fs_1.default.readFileSync(torrent)), fileOptions);
            }
            else {
                form.append('file', Buffer.from(torrent, 'base64'), fileOptions);
            }
        }
        else {
            form.append('file', torrent, fileOptions);
        }
        if (options) {
            for (const key of Object.keys(options)) {
                form.append(key, options[key]);
            }
        }
        const res = await this.request('/torrents/add', 'POST', undefined, form, form.getHeaders(), false);
        if (res.body === 'Fails.') {
            throw new Error('Failed to add torrent');
        }
        return true;
    }
    async normalizedAddTorrent(torrent, options = {}) {
        const torrentOptions = {};
        if (options.startPaused) {
            torrentOptions.paused = 'true';
        }
        if (options.label) {
            torrentOptions.category = options.label;
        }
        if (!Buffer.isBuffer(torrent)) {
            torrent = Buffer.from(torrent);
        }
        const torrentHash = await torrent_file_1.hash(torrent);
        await this.addTorrent(torrent, torrentOptions);
        return this.getTorrent(torrentHash);
    }
    async addTrackers(hash, urls) {
        const params = { hash, urls };
        await this.request('/torrents/addTrackers', 'GET', params);
        return true;
    }
    async editTrackers(hash, origUrl, newUrl) {
        const params = { hash, origUrl, newUrl };
        await this.request('/torrents/editTrackers', 'GET', params);
        return true;
    }
    async removeTrackers(hash, urls) {
        const params = { hash, urls };
        await this.request('/torrents/editTrackers', 'GET', params);
        return true;
    }
    async queueUp(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/increasePrio', 'GET', params);
        return true;
    }
    async queueDown(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/decreasePrio', 'GET', params);
        return true;
    }
    async topPriority(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/topPrio', 'GET', params);
        return true;
    }
    async bottomPriority(hashes) {
        const params = {
            hashes: this._normalizeHashes(hashes),
        };
        await this.request('/torrents/bottomPrio', 'GET', params);
        return true;
    }
    async login() {
        const url = url_join_1.default(this.config.baseUrl, this.config.path, '/auth/login');
        const options = {
            form: true,
            body: {
                username: this.config.username,
                password: this.config.password,
            },
            followRedirect: false,
            retry: 0,
        };
        // allow proxy agent
        if (this.config.agent) {
            options.agent = this.config.agent;
        }
        if (this.config.timeout) {
            options.timeout = this.config.timeout;
        }
        const res = await got_1.default.post(url, options);
        if (!res.headers['set-cookie'] || !res.headers['set-cookie'].length) {
            throw new Error('Cookie not found. Auth Failed.');
        }
        const cookie = tough_cookie_1.Cookie.parse(res.headers['set-cookie'][0]);
        if (!cookie || (cookie.key !== 'SID' && cookie.key !== 'QB_SID')) {
            throw new Error('Invalid cookie');
        }
        this._sid = cookie.value;
        return true;
    }
    logout() {
        this._sid = undefined;
        return true;
    }
    // eslint-disable-next-line max-params
    async request(path, method, params = {}, body, headers = {}, json = true) {
        if (!this._sid) {
            const authed = await this.login();
            if (!authed) {
                throw new Error('Auth Failed');
            }
        }
        const url = url_join_1.default(this.config.baseUrl, this.config.path, path);
        const options = {
            method,
            headers: Object.assign({ Cookie: `QB_SID=${this._sid};SID=${this._sid}` }, headers),
            retry: 0,
            json,
            body,
            query: params,
        };
        // allow proxy agent
        if (this.config.agent) {
            options.agent = this.config.agent;
        }
        if (this.config.timeout) {
            options.timeout = this.config.timeout;
        }
        return got_1.default(url, options);
    }
    /**
     * Normalizes hashes
     * @returns hashes as string seperated by `|`
     */
    _normalizeHashes(hashes) {
        if (Array.isArray(hashes)) {
            return hashes.join('|');
        }
        return hashes;
    }
    _normalizeTorrentData(torrent) {
        let state = shared_torrent_1.TorrentState.unknown;
        switch (torrent.state) {
            case types_1.TorrentState.ForcedDL:
            case types_1.TorrentState.MetaDL:
                state = shared_torrent_1.TorrentState.downloading;
                break;
            case types_1.TorrentState.Allocating:
                // state = 'stalledDL';
                state = shared_torrent_1.TorrentState.queued;
                break;
            case types_1.TorrentState.ForcedUP:
                state = shared_torrent_1.TorrentState.seeding;
                break;
            case types_1.TorrentState.PausedDL:
                state = shared_torrent_1.TorrentState.paused;
                break;
            case types_1.TorrentState.PausedUP:
                // state = 'completed';
                state = shared_torrent_1.TorrentState.paused;
                break;
            case types_1.TorrentState.QueuedDL:
            case types_1.TorrentState.QueuedUP:
                state = shared_torrent_1.TorrentState.queued;
                break;
            case types_1.TorrentState.CheckingDL:
            case types_1.TorrentState.CheckingUP:
            case types_1.TorrentState.QueuedForChecking:
            case types_1.TorrentState.CheckingResumeData:
            case types_1.TorrentState.Moving:
                state = shared_torrent_1.TorrentState.checking;
                break;
            case types_1.TorrentState.Unknown:
            case types_1.TorrentState.MissingFiles:
                state = shared_torrent_1.TorrentState.error;
                break;
            default:
                break;
        }
        const isCompleted = torrent.progress >= 100;
        const result = {
            id: torrent.hash,
            name: torrent.name,
            stateMessage: '',
            state,
            dateAdded: new Date(torrent.added_on * 1000).toISOString(),
            isCompleted,
            progress: torrent.progress,
            label: torrent.category,
            dateCompleted: new Date(torrent.completion_on * 1000).toISOString(),
            savePath: torrent.save_path,
            uploadSpeed: torrent.upspeed,
            downloadSpeed: torrent.dlspeed,
            eta: torrent.eta,
            queuePosition: torrent.priority,
            connectedPeers: torrent.num_leechs,
            connectedSeeds: torrent.num_seeds,
            totalPeers: torrent.num_incomplete,
            totalSeeds: torrent.num_complete,
            totalSelected: torrent.size,
            totalSize: torrent.total_size,
            totalUploaded: torrent.uploaded,
            totalDownloaded: torrent.downloaded,
            ratio: torrent.ratio,
        };
        return result;
    }
}
exports.QBittorrent = QBittorrent;
//# sourceMappingURL=index.js.map