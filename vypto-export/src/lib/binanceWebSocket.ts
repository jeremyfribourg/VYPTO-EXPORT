interface BinanceTickerData {
  s: string  // symbol
  c: string  // current price
  P: string  // price change percent
  o: string  // open price
  h: string  // high price
  l: string  // low price
  v: string  // volume
}

interface BinanceMiniTickerData {
  s: string  // symbol
  c: string  // current price
  o: string  // open price
  h: string  // high price
  l: string  // low price
  v: string  // volume
  q: string  // quote volume
}

export interface CryptoPrice {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  volume_24h: number
  last_updated: string
  image: string
  isFavorite?: boolean
}

class BinanceWebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private isConnecting = false
  private subscribers: Set<(data: CryptoPrice[]) => void> = new Set()
  private priceData: Map<string, CryptoPrice> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private connectionTimeout: NodeJS.Timeout | null = null
  private lastPingTime = 0

  // Comprehensive cryptocurrency symbols from Binance (all major USDT pairs)
  private readonly SYMBOLS = [
    // Top Market Cap Coins
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
    'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'SHIBUSDT',
    'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'LINKUSDT', 'ATOMUSDT',
    'ETCUSDT', 'XLMUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT',
    
    // Major Altcoins
    'APTUSDT', 'NEARUSDT', 'VETUSDT', 'ICPUSDT', 'FTMUSDT',
    'HBARUSDT', 'QNTUSDT', 'EOSUSDT', 'XMRUSDT', 'AAVEUSDT',
    'ALGOUSDT', 'FLOWUSDT', 'SANDUSDT', 'MANAUSDT', 'AXSUSDT',
    'THETAUSDT', 'XTZUSDT', 'APEUSDT', 'CHZUSDT', 'GALAUSDT',
    'ENJUSDT', 'ROSEUSDT', 'KLAYUSDT', 'WAVESUSDT', 'LRCUSDT',
    'WLDUSDT',
    
    // DeFi & Layer 2
    'COMPUSDT', 'CRVUSDT', 'YFIUSDT', 'SUSHIUSDT', '1INCHUSDT',
    'MKRUSDT', 'SNXUSDT', 'BALUSDT', 'UMAUSDT', 'KAVAUSDT',
    'KNCUSDT', 'RENUSDT', 'BANDUSDT', 'INJUSDT', 'RUNEUSDT',
    'DYDXUSDT', 'OPUSDT', 'ARBUSDT', 'SUIUSDT', 'STXUSDT', 
    'IMXUSDT',
    
    // Gaming & Metaverse
    'ILVUSDT', 'JASMYUSDT', 'GALUSDT', 'ALICEUSDT', 'TLMUSDT',
    'PSGUSDT', 'CITYUSDT', 'ASRUSDT', 'ACRMUSDT', 'OGUSDT',
    'POROUSDT', 'SANTOSUSDT', 'VOXELUSDT', 'HIGHUSDT',
    'RADUSDT', 'BETAUSDT', 'RAREUSDT', 'LAZIOUSDT',
    
    // AI & Data
    'FETUSDT', 'OCEANUSDT', 'GRTUSDT', 'NUUSDT', 'CTSIUSDT',
    'AIUSDT', 'PHBUSDT', 'MDTUSDT', 'ARKMUSDT', 'NKNUSDT', 
    'STORJUSDT', 'SCUSDT',
    
    // Meme Coins
    'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT', 'WIFUSDT', 'BOMEUSDT',
    'PEOPLEUSDT', 'BABYDOGEUSDT', 'AKROUSDT', 'DOGENUSDT',
    
    // Privacy Coins
    'ZECUSDT', 'DASHUSDT', 'XVGUSDT', 'SCRTUSDT',
    
    // Infrastructure & Tools
    'CELRUSDT', 'CKBUSDT', 'MINAUSDT', 'COTIUSDT',
    'NEOUSDT', 'ONTUSDT', 'QTUMUSDT', 'ICXUSDT', 
    'VITEUSDT', 'NULSUSDT',
    
    // Emerging & New Projects
    'SEIUSDT', 'TIAUSDT', 'ALTUSDT', 'JUPUSDT',
    'PYTHUSDT', 'STRKUSDT', 'MANTAUSDT', 'ACEUSDT', 
    'XAIUSDT', 'MYROUSDT', 'METISUSDT',
    
    // Additional Popular Coins
    'RVNUSDT', 'HOTUSDT', 'BTTCUSDT', 'FUNUSDT', 'DENTUSDT', 
    'KEYUSDT', 'STMXUSDT', 'DOCKUSDT', 'OMGUSDT', 'C98USDT',
    'LSKUSDT'
  ]

  // Map Binance symbols to CoinGecko IDs for compatibility
  private readonly SYMBOL_MAP: Record<string, { id: string; name: string; image: string }> = {
    // Top Market Cap
    'BTCUSDT': { id: 'bitcoin', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
    'ETHUSDT': { id: 'ethereum', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    'BNBUSDT': { id: 'binancecoin', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
    'XRPUSDT': { id: 'ripple', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
    'ADAUSDT': { id: 'cardano', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
    'SOLUSDT': { id: 'solana', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    'DOTUSDT': { id: 'polkadot', name: 'Polkadot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
    'DOGEUSDT': { id: 'dogecoin', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
    'AVAXUSDT': { id: 'avalanche-2', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
    'SHIBUSDT': { id: 'shiba-inu', name: 'Shiba Inu', image: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png' },
    'MATICUSDT': { id: 'matic-network', name: 'Polygon', image: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png' },
    'LTCUSDT': { id: 'litecoin', name: 'Litecoin', image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
    'UNIUSDT': { id: 'uniswap', name: 'Uniswap', image: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png' },
    'LINKUSDT': { id: 'chainlink', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
    'ATOMUSDT': { id: 'cosmos', name: 'Cosmos', image: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png' },
    'ETCUSDT': { id: 'ethereum-classic', name: 'Ethereum Classic', image: 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png' },
    'XLMUSDT': { id: 'stellar', name: 'Stellar', image: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' },
    'BCHUSDT': { id: 'bitcoin-cash', name: 'Bitcoin Cash', image: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png' },
    'FILUSDT': { id: 'filecoin', name: 'Filecoin', image: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png' },
    'TRXUSDT': { id: 'tron', name: 'TRON', image: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png' },
    
    // Major Altcoins
    'APTUSDT': { id: 'aptos', name: 'Aptos', image: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png' },
    'NEARUSDT': { id: 'near', name: 'NEAR Protocol', image: 'https://assets.coingecko.com/coins/images/10365/small/near_icon.png' },
    'VETUSDT': { id: 'vechain', name: 'VeChain', image: 'https://assets.coingecko.com/coins/images/1167/small/VeChain-Logo-768x725.png' },
    'ICPUSDT': { id: 'internet-computer', name: 'Internet Computer', image: 'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png' },
    'FTMUSDT': { id: 'fantom', name: 'Fantom', image: 'https://assets.coingecko.com/coins/images/4001/small/Fantom.png' },
    'HBARUSDT': { id: 'hedera-hashgraph', name: 'Hedera', image: 'https://assets.coingecko.com/coins/images/3441/small/Hedera_Hashgraph.png' },
    'QNTUSDT': { id: 'quant-network', name: 'Quant', image: 'https://assets.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg' },
    'EOSUSDT': { id: 'eos', name: 'EOS', image: 'https://assets.coingecko.com/coins/images/738/small/eos-eos-logo.png' },
    'XMRUSDT': { id: 'monero', name: 'Monero', image: 'https://assets.coingecko.com/coins/images/69/small/monero_logo.png' },
    'AAVEUSDT': { id: 'aave', name: 'Aave', image: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png' },
    'ALGOUSDT': { id: 'algorand', name: 'Algorand', image: 'https://assets.coingecko.com/coins/images/4380/small/download.png' },
    'FLOWUSDT': { id: 'flow', name: 'Flow', image: 'https://assets.coingecko.com/coins/images/13446/small/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png' },
    'SANDUSDT': { id: 'the-sandbox', name: 'The Sandbox', image: 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg' },
    'MANAUSDT': { id: 'decentraland', name: 'Decentraland', image: 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png' },
    'AXSUSDT': { id: 'axie-infinity', name: 'Axie Infinity', image: 'https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png' },
    'THETAUSDT': { id: 'theta-token', name: 'Theta Network', image: 'https://assets.coingecko.com/coins/images/2538/small/theta-token-logo.png' },
    'XTZUSDT': { id: 'tezos', name: 'Tezos', image: 'https://assets.coingecko.com/coins/images/976/small/Tezos-logo.png' },
    'APEUSDT': { id: 'apecoin', name: 'ApeCoin', image: 'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg' },
    'CHZUSDT': { id: 'chiliz', name: 'Chiliz', image: 'https://assets.coingecko.com/coins/images/8834/small/Chiliz.png' },
    'GALAUSDT': { id: 'gala', name: 'Gala', image: 'https://assets.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png' },
    'ENJUSDT': { id: 'enjincoin', name: 'Enjin Coin', image: 'https://assets.coingecko.com/coins/images/1102/small/enjin-coin-logo.png' },
    'ROSEUSDT': { id: 'oasis-network', name: 'Oasis Network', image: 'https://assets.coingecko.com/coins/images/13162/small/rose.png' },
    'KLAYUSDT': { id: 'klay-token', name: 'Klaytn', image: 'https://assets.coingecko.com/coins/images/9672/small/klaytn.png' },
    'WAVESUSDT': { id: 'waves', name: 'Waves', image: 'https://assets.coingecko.com/coins/images/425/small/waves.png' },
    'LRCUSDT': { id: 'loopring', name: 'Loopring', image: 'https://assets.coingecko.com/coins/images/913/small/LRC.png' },
    'WLDUSDT': { id: 'worldcoin-wld', name: 'Worldcoin', image: 'https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg' },
    
    // DeFi
    'COMPUSDT': { id: 'compound-governance-token', name: 'Compound', image: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png' },
    'CRVUSDT': { id: 'curve-dao-token', name: 'Curve DAO Token', image: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png' },
    'YFIUSDT': { id: 'yearn-finance', name: 'yearn.finance', image: 'https://assets.coingecko.com/coins/images/11849/small/yfi-192x192.png' },
    'SUSHIUSDT': { id: 'sushi', name: 'SushiSwap', image: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png' },
    '1INCHUSDT': { id: '1inch', name: '1inch Network', image: 'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png' },
    'MKRUSDT': { id: 'maker', name: 'Maker', image: 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png' },
    'SNXUSDT': { id: 'havven', name: 'Synthetix', image: 'https://assets.coingecko.com/coins/images/3406/small/SNX.png' },
    'BALUSDT': { id: 'balancer', name: 'Balancer', image: 'https://assets.coingecko.com/coins/images/11683/small/Balancer.png' },
    'UMAUSDT': { id: 'uma', name: 'UMA', image: 'https://assets.coingecko.com/coins/images/10951/small/UMA.png' },
    'KAVAUSDT': { id: 'kava', name: 'Kava', image: 'https://assets.coingecko.com/coins/images/9761/small/kava.png' },
    'KNCUSDT': { id: 'kyber-network-crystal', name: 'Kyber Network Crystal v2', image: 'https://assets.coingecko.com/coins/images/14899/small/RwdVsGcw_400x400.jpg' },
    'RENUSDT': { id: 'republic-protocol', name: 'Ren', image: 'https://assets.coingecko.com/coins/images/3139/small/REN.png' },
    'BANDUSDT': { id: 'band-protocol', name: 'Band Protocol', image: 'https://assets.coingecko.com/coins/images/9545/small/Band_token_blue_violet_token.png' },
    'INJUSDT': { id: 'injective-protocol', name: 'Injective', image: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png' },
    'RUNEUSDT': { id: 'thorchain', name: 'THORChain', image: 'https://assets.coingecko.com/coins/images/6595/small/RUNE.png' },
    
    // Layer 2 & Scaling
    'DYDXUSDT': { id: 'dydx', name: 'dYdX', image: 'https://assets.coingecko.com/coins/images/17500/small/hjnIm9bV.jpg' },
    'OPUSDT': { id: 'optimism', name: 'Optimism', image: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
    'ARBUSDT': { id: 'arbitrum', name: 'Arbitrum', image: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg' },
    'SUIUSDT': { id: 'sui', name: 'Sui', image: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg' },
    'STXUSDT': { id: 'stacks', name: 'Stacks', image: 'https://assets.coingecko.com/coins/images/2069/small/Stacks_logo_full.png' },
    'IMXUSDT': { id: 'immutable-x', name: 'Immutable X', image: 'https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png' },
    
    // Gaming & Metaverse
    'ILVUSDT': { id: 'illuvium', name: 'Illuvium', image: 'https://assets.coingecko.com/coins/images/14468/small/ILV.JPG' },
    'JASMYUSDT': { id: 'jasmycoin', name: 'JasmyCoin', image: 'https://assets.coingecko.com/coins/images/13876/small/JASMY200x200.jpg' },
    'GALUSDT': { id: 'galatasaray-fan-token', name: 'Galatasaray Fan Token', image: 'https://assets.coingecko.com/coins/images/12635/small/fan_token.jpg' },
    'ALICEUSDT': { id: 'my-neighbor-alice', name: 'My Neighbor Alice', image: 'https://assets.coingecko.com/coins/images/14375/small/alice_logo.jpg' },
    'TLMUSDT': { id: 'alien-worlds', name: 'Alien Worlds', image: 'https://assets.coingecko.com/coins/images/14676/small/kY-C4o7RThfWrDQsLCAG4q4clZhBDDfJQVhWUEKxXAzyQYMj4Jmq1zmFwpRqxhAJFPOa0AsW_PTSshoPuMnXNwq3rU7Imp15QimXTjlXMx0nC088mt1rIwRs75GnLLugWjSllxgZvA=s128.png' },
    'PSGUSDT': { id: 'paris-saint-germain-fan-token', name: 'Paris Saint-Germain Fan Token', image: 'https://assets.coingecko.com/coins/images/12586/small/paris-saint-germain-fan-token_logo.jpg' },
    'CITYUSDT': { id: 'manchester-city-fan-token', name: 'Manchester City Fan Token', image: 'https://assets.coingecko.com/coins/images/12579/small/manchester_city_fan_token_logo.jpg' },
    'ASRUSDT': { id: 'as-roma-fan-token', name: 'AS Roma Fan Token', image: 'https://assets.coingecko.com/coins/images/12591/small/as-roma-fan-token_logo.jpg' },
    'ACRMUSDT': { id: 'ac-milan-fan-token', name: 'AC Milan Fan Token', image: 'https://assets.coingecko.com/coins/images/14910/small/Lgo_AC_Milan.jpg' },
    'OGUSDT': { id: 'og-fan-token', name: 'OG Fan Token', image: 'https://assets.coingecko.com/coins/images/12651/small/OG_Fan_Token_Logo.jpg' },
    'POROUSDT': { id: 'fc-porto', name: 'FC Porto', image: 'https://assets.coingecko.com/coins/images/14899/small/RwdVsGcw_400x400.jpg' },
    'SANTOSUSDT': { id: 'santos-fc-fan-token', name: 'Santos FC Fan Token', image: 'https://assets.coingecko.com/coins/images/15073/small/santos_logo.jpg' },
    'VOXELUSDT': { id: 'voxies', name: 'Voxies', image: 'https://assets.coingecko.com/coins/images/19631/small/VOXEL_LOGO.png' },
    'HIGHUSDT': { id: 'highstreet', name: 'Highstreet', image: 'https://assets.coingecko.com/coins/images/18973/small/logosq200200Coingecko.png' },
    'RADUSDT': { id: 'radicle', name: 'Radicle', image: 'https://assets.coingecko.com/coins/images/14013/small/radicle.png' },
    'BETAUSDT': { id: 'beta-finance', name: 'Beta Finance', image: 'https://assets.coingecko.com/coins/images/17435/small/beta-logo.jpg' },
    'RAREUSDT': { id: 'superrare', name: 'SuperRare', image: 'https://assets.coingecko.com/coins/images/17753/small/RARE.jpg' },
    'LAZIOUSDT': { id: 'lazio-fan-token', name: 'Lazio Fan Token', image: 'https://assets.coingecko.com/coins/images/12593/small/lazio-fan-token_logo.jpg' },
    
    // Meme Coins
    'PEPEUSDT': { id: 'pepe', name: 'Pepe', image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg' },
    'FLOKIUSDT': { id: 'floki', name: 'FLOKI', image: 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png' },
    'BONKUSDT': { id: 'bonk', name: 'Bonk', image: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg' },
    'WIFUSDT': { id: 'dogwifcoin', name: 'dogwifhat', image: 'https://assets.coingecko.com/coins/images/33767/small/dogwifhat.jpg' },
    'BOMEUSDT': { id: 'book-of-meme', name: 'Book of Meme', image: 'https://assets.coingecko.com/coins/images/35264/small/bome.png' },
    'PEOPLEUSDT': { id: 'constitutiondao', name: 'ConstitutionDAO', image: 'https://assets.coingecko.com/coins/images/19013/small/people.jpg' },
    'BABYDOGEUSDT': { id: 'baby-doge-coin', name: 'Baby Doge Coin', image: 'https://assets.coingecko.com/coins/images/16125/small/babydoge.jpg' },
    'AKROUSDT': { id: 'akropolis', name: 'Akropolis', image: 'https://assets.coingecko.com/coins/images/3328/small/logo_colour.png' },
    'DOGENUSDT': { id: 'dogecoin', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
    
    // AI & Data
    'FETUSDT': { id: 'fetch-ai', name: 'Artificial Superintelligence Alliance', image: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg' },
    'OCEANUSDT': { id: 'ocean-protocol', name: 'Ocean Protocol', image: 'https://assets.coingecko.com/coins/images/3687/small/ocean-protocol-logo.jpg' },
    'GRTUSDT': { id: 'the-graph', name: 'The Graph', image: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png' },
    'NUUSDT': { id: 'nucypher', name: 'NuCypher', image: 'https://assets.coingecko.com/coins/images/3318/small/nu-icon.png' },
    'CTSIUSDT': { id: 'cartesi', name: 'Cartesi', image: 'https://assets.coingecko.com/coins/images/11038/small/cartesi.png' },
    'AIUSDT': { id: 'sleepless-ai', name: 'Sleepless AI', image: 'https://assets.coingecko.com/coins/images/33346/small/sleeplessai.png' },
    'PHBUSDT': { id: 'phoenix-global', name: 'Phoenix', image: 'https://assets.coingecko.com/coins/images/4343/small/yCK2b8Q.png' },
    'MDTUSDT': { id: 'measurable-data-token', name: 'Measurable Data Token', image: 'https://assets.coingecko.com/coins/images/2441/small/mdt_logo.png' },
    'ARKMUSDT': { id: 'arkham', name: 'Arkham', image: 'https://assets.coingecko.com/coins/images/30456/small/arkm.png' },
    'NKNUSDT': { id: 'nkn', name: 'NKN', image: 'https://assets.coingecko.com/coins/images/3375/small/nkn.png' },
    'STORJUSDT': { id: 'storj', name: 'Storj', image: 'https://assets.coingecko.com/coins/images/949/small/storj.png' },
    'SCUSDT': { id: 'siacoin', name: 'Siacoin', image: 'https://assets.coingecko.com/coins/images/289/small/siacoin.png' },
    
    // Privacy
    'ZECUSDT': { id: 'zcash', name: 'Zcash', image: 'https://assets.coingecko.com/coins/images/486/small/circle-zcash-color.png' },
    'DASHUSDT': { id: 'dash', name: 'Dash', image: 'https://assets.coingecko.com/coins/images/19/small/dash-logo.png' },
    'XVGUSDT': { id: 'verge', name: 'Verge', image: 'https://assets.coingecko.com/coins/images/693/small/verge-symbol-black.png' },
    'SCRTUSDT': { id: 'secret', name: 'Secret', image: 'https://assets.coingecko.com/coins/images/11871/small/Secret.png' },
    
    // Infrastructure
    'CELRUSDT': { id: 'celer-network', name: 'Celer Network', image: 'https://assets.coingecko.com/coins/images/4379/small/Celr.png' },
    'CKBUSDT': { id: 'nervos-network', name: 'Nervos Network', image: 'https://assets.coingecko.com/coins/images/9566/small/nervos.png' },
    'MINAUSDT': { id: 'mina-protocol', name: 'Mina', image: 'https://assets.coingecko.com/coins/images/15628/small/JM4_vQ34_400x400.png' },
    'COTIUSDT': { id: 'coti', name: 'COTI', image: 'https://assets.coingecko.com/coins/images/2962/small/Coti.png' },
    'NEOUSDT': { id: 'neo', name: 'Neo', image: 'https://assets.coingecko.com/coins/images/480/small/NEO_512_512.png' },
    'ONTUSDT': { id: 'ontology', name: 'Ontology', image: 'https://assets.coingecko.com/coins/images/4581/small/ontology.png' },
    'QTUMUSDT': { id: 'qtum', name: 'Qtum', image: 'https://assets.coingecko.com/coins/images/684/small/Qtum.png' },
    'ICXUSDT': { id: 'icon', name: 'ICON', image: 'https://assets.coingecko.com/coins/images/1060/small/icon-icx-logo.png' },
    'VITEUSDT': { id: 'vite', name: 'Vite', image: 'https://assets.coingecko.com/coins/images/2937/small/vite.png' },
    'NULSUSDT': { id: 'nuls', name: 'Nuls', image: 'https://assets.coingecko.com/coins/images/2092/small/nuls.png' },
    
    // Emerging Projects
    'SEIUSDT': { id: 'sei-network', name: 'Sei', image: 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png' },
    'TIAUSDT': { id: 'celestia', name: 'Celestia', image: 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg' },
    'ALTUSDT': { id: 'altlayer', name: 'AltLayer', image: 'https://assets.coingecko.com/coins/images/33979/small/altlayer.jpeg' },
    'JUPUSDT': { id: 'jupiter-exchange-solana', name: 'Jupiter', image: 'https://assets.coingecko.com/coins/images/34188/small/jup.png' },
    'PYTHUSDT': { id: 'pyth-network', name: 'Pyth Network', image: 'https://assets.coingecko.com/coins/images/31833/small/pyth.jpg' },
    'STRKUSDT': { id: 'starknet', name: 'Starknet', image: 'https://assets.coingecko.com/coins/images/26433/small/starknet.png' },
    'MANTAUSDT': { id: 'manta-network', name: 'Manta Network', image: 'https://assets.coingecko.com/coins/images/30145/small/manta_pacific.jpg' },
    'ACEUSDT': { id: 'endurance', name: 'Endurance', image: 'https://assets.coingecko.com/coins/images/24977/small/Endurance_Logo_Icon_200x200px.png' },
    'XAIUSDT': { id: 'xai-blockchain', name: 'Xai', image: 'https://assets.coingecko.com/coins/images/33457/small/xai-logo.png' },
    'MYROUSDT': { id: 'myro', name: 'Myro', image: 'https://assets.coingecko.com/coins/images/32621/small/myro.png' },
    'METISUSDT': { id: 'metis-token', name: 'Metis', image: 'https://assets.coingecko.com/coins/images/15595/small/metis.PNG' },
    
    // Additional Popular
    'RVNUSDT': { id: 'ravencoin', name: 'Ravencoin', image: 'https://assets.coingecko.com/coins/images/3412/small/ravencoin.png' },
    'HOTUSDT': { id: 'holotoken', name: 'Holo', image: 'https://assets.coingecko.com/coins/images/3348/small/Holologo_Profile.png' },
    'BTTCUSDT': { id: 'bittorrent', name: 'BitTorrent [New]', image: 'https://assets.coingecko.com/coins/images/22457/small/btt_logo.png' },
    'FUNUSDT': { id: 'funfair', name: 'FunFair', image: 'https://assets.coingecko.com/coins/images/761/small/funfair.png' },
    'DENTUSDT': { id: 'dent', name: 'Dent', image: 'https://assets.coingecko.com/coins/images/1152/small/gLCEA2G.png' },
    'KEYUSDT': { id: 'selfkey', name: 'SelfKey', image: 'https://assets.coingecko.com/coins/images/2034/small/SelfKey.png' },
    'STMXUSDT': { id: 'storm', name: 'StormX', image: 'https://assets.coingecko.com/coins/images/1369/small/StormX.png' },
    'DOCKUSDT': { id: 'dock', name: 'Dock', image: 'https://assets.coingecko.com/coins/images/3978/small/Dock.png' },
    'OMGUSDT': { id: 'omisego', name: 'OMG Network', image: 'https://assets.coingecko.com/coins/images/776/small/OMG_Network.jpg' },
    'C98USDT': { id: 'coin98', name: 'Coin98', image: 'https://assets.coingecko.com/coins/images/17117/small/logo.png' },
    'LSKUSDT': { id: 'lisk', name: 'Lisk', image: 'https://assets.coingecko.com/coins/images/385/small/Lisk_Symbol_-_Blue.png' }
  }

  constructor() {
    this.initializeDefaultData()
  }

  private initializeDefaultData() {
    // Initialize with default price data
    Object.entries(this.SYMBOL_MAP).forEach(([symbol, info]) => {
      this.priceData.set(info.id, {
        id: info.id,
        symbol: symbol.replace('USDT', '').toLowerCase(),
        name: info.name,
        current_price: 0,
        price_change_percentage_24h: 0,
        market_cap: 0,
        volume_24h: 0,
        last_updated: new Date().toISOString(),
        image: info.image
      })
    })
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('🔗 WebSocket already connected or connecting')
      return
    }

    this.isConnecting = true
    console.log('🚀 Connecting to Binance WebSocket...')

    // Use Binance's "all mini ticker" stream for comprehensive coverage
    // This provides data for ALL trading pairs at once, which is more reliable
    const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr'

    try {
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('✅ Connected to Binance WebSocket - All Mini Ticker Stream')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.notifySubscribers()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Process array of mini ticker data
          if (Array.isArray(data)) {
            data.forEach((ticker: BinanceMiniTickerData) => {
              this.processMiniTickerData(ticker)
            })
          } else {
            // Single ticker data
            this.processMiniTickerData(data as BinanceMiniTickerData)
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason)
        this.isConnecting = false
        this.stopHeartbeat()
        
        if (event.code !== 1000) { // Not a normal closure
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        this.isConnecting = false
        this.scheduleReconnect()
      }

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.isConnecting) {
          console.warn('⏰ WebSocket connection timeout')
          this.disconnect()
          this.scheduleReconnect()
        }
      }, 10000)

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  private processMiniTickerData(data: BinanceMiniTickerData) {
    const symbolInfo = this.SYMBOL_MAP[data.s]
    if (!symbolInfo) return // Only process symbols we're tracking

    const currentPrice = parseFloat(data.c)
    const openPrice = parseFloat(data.o)
    const priceChangePercent = ((currentPrice - openPrice) / openPrice) * 100
    const volume = parseFloat(data.v)

    // Estimate market cap (this is approximate since we don't have supply data)
    const estimatedMarketCap = currentPrice * 1000000 // Rough estimate

    const cryptoPrice: CryptoPrice = {
      id: symbolInfo.id,
      symbol: data.s.replace('USDT', '').toLowerCase(),
      name: symbolInfo.name,
      current_price: currentPrice,
      price_change_percentage_24h: priceChangePercent,
      market_cap: estimatedMarketCap,
      volume_24h: volume,
      last_updated: new Date().toISOString(),
      image: symbolInfo.image
    }

    this.priceData.set(symbolInfo.id, cryptoPrice)
    
    // Throttled notification to prevent overwhelming subscribers
    if (!this.throttleNotification) {
      this.throttleNotification = setTimeout(() => {
        this.notifySubscribers()
        this.throttleNotification = null
      }, 100) // Notify at most every 100ms
    }
  }

  private throttleNotification: NodeJS.Timeout | null = null

  private startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        // Browser WebSocket doesn't have ping method - Binance handles keepalive automatically
        console.log('💓 WebSocket heartbeat check - connection active')
      } else {
        console.warn('💔 WebSocket not ready for heartbeat')
        this.scheduleReconnect()
      }
    }, 30000) // Check every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    if (this.throttleNotification) {
      clearTimeout(this.throttleNotification)
      this.throttleNotification = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Max reconnection attempts reached')
      return
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect()
      }
    }, delay)
  }

  private notifySubscribers() {
    const allPrices = Array.from(this.priceData.values())
    this.subscribers.forEach(callback => {
      try {
        callback(allPrices)
      } catch (error) {
        console.error('❌ Error notifying subscriber:', error)
      }
    })
  }

  subscribe(callback: (data: CryptoPrice[]) => void) {
    this.subscribers.add(callback)
    
    // Send current data immediately
    if (this.priceData.size > 0) {
      callback(Array.from(this.priceData.values()))
    }

    return () => {
      this.subscribers.delete(callback)
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket...')
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect')
      this.ws = null
    }
    
    this.isConnecting = false
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting'
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return 'connected'
    if (this.ws && this.ws.readyState === WebSocket.CLOSED) return 'disconnected'
    return 'error'
  }

  getCurrentPrices(): CryptoPrice[] {
    return Array.from(this.priceData.values())
  }

  getPriceById(id: string): CryptoPrice | undefined {
    return this.priceData.get(id)
  }
}

// Export singleton instance
export const binanceWebSocket = new BinanceWebSocketManager()
