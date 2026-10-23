// Static ticker metadata (symbol/exchange only) ported from the reference page's
// tickers object, stripped of the stale Sep 17, 2026 price snapshot. Live prices/changes
// are fetched from /api/quote at render time for isUS entries; non-US entries show a
// 'live pricing unavailable' notice since Finnhub's free tier is US-listed only.

export interface TickerMeta {
  symbol: string;
  exchange: string;
  isUS: boolean;
  note?: string;
}

export const tickers: Record<string, TickerMeta[]> = {
  "deepmind": [
    {
      "symbol": "GOOGL",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "microsoftai": [
    {
      "symbol": "MSFT",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "metamsl": [
    {
      "symbol": "META",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "xai": [
    {
      "symbol": "SPCX",
      "exchange": "NASDAQ",
      "isUS": true,
      "note": "IPO'd June 2026 at $135; very few sessions of history — verify before acting"
    }
  ],
  "azure": [
    {
      "symbol": "MSFT",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "aws": [
    {
      "symbol": "AMZN",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "gcloud": [
    {
      "symbol": "GOOGL",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "oracle": [
    {
      "symbol": "ORCL",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "metadc": [
    {
      "symbol": "META",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "apple": [
    {
      "symbol": "AAPL",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "coreweave": [
    {
      "symbol": "CRWV",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "nebius": [
    {
      "symbol": "NBIS",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "chinacsp": [
    {
      "symbol": "BABA",
      "exchange": "NYSE",
      "isUS": true
    },
    {
      "symbol": "BIDU",
      "exchange": "NASDAQ",
      "isUS": true
    },
    {
      "symbol": "TCEHY",
      "exchange": "OTC (ADR)",
      "isUS": true
    }
  ],
  "nvidia": [
    {
      "symbol": "NVDA",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "broadcom": [
    {
      "symbol": "AVGO",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "amd": [
    {
      "symbol": "AMD",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "marvell": [
    {
      "symbol": "MRVL",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "trainium": [
    {
      "symbol": "AMZN",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "maia": [
    {
      "symbol": "MSFT",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "cerebras": [
    {
      "symbol": "CBRS",
      "exchange": "NASDAQ",
      "isUS": true,
      "note": "Recent IPO, thinly covered — verify before acting"
    }
  ],
  "cambricon": [
    {
      "symbol": "688256.SS",
      "exchange": "Shanghai (STAR)",
      "isUS": false,
      "note": "Foreign-listed in CNY — check a China A-share source"
    }
  ],
  "arm": [
    {
      "symbol": "ARM",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "softbank": [
    {
      "symbol": "9984.T",
      "exchange": "Tokyo",
      "isUS": false,
      "note": "Foreign-listed in JPY; OTC ADR ticker SFTBY also trades"
    }
  ],
  "qualcomm": [
    {
      "symbol": "QCOM",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "intel": [
    {
      "symbol": "INTC",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "tsmc": [
    {
      "symbol": "TSM",
      "exchange": "NYSE (ADR)",
      "isUS": true
    }
  ],
  "smic": [
    {
      "symbol": "0981.HK",
      "exchange": "Hong Kong",
      "isUS": false,
      "note": "Foreign-listed in HKD — check a Hong Kong exchange source"
    }
  ],
  "skhynix": [
    {
      "symbol": "000660.KS",
      "exchange": "Korea (KOSPI)",
      "isUS": false,
      "note": "Foreign-listed in KRW — check a Korea exchange source"
    }
  ],
  "samsung": [
    {
      "symbol": "005930.KS",
      "exchange": "Korea (KOSPI)",
      "isUS": false,
      "note": "Foreign-listed in KRW; OTC ADR ticker SSNLF also trades"
    }
  ],
  "micron": [
    {
      "symbol": "MU",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "asml": [
    {
      "symbol": "ASML",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "packaging": [
    {
      "symbol": "ASX",
      "exchange": "NYSE (ADR)",
      "isUS": true,
      "note": "ASE Technology — verify separately"
    },
    {
      "symbol": "AMKR",
      "exchange": "NASDAQ",
      "isUS": true,
      "note": "Amkor — verify separately"
    }
  ],
  "eda": [
    {
      "symbol": "SNPS",
      "exchange": "NASDAQ",
      "isUS": true
    },
    {
      "symbol": "CDNS",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "optics": [
    {
      "symbol": "300308.SZ",
      "exchange": "Shenzhen",
      "isUS": false,
      "note": "Innolight — foreign-listed in CNY"
    },
    {
      "symbol": "300502.SZ",
      "exchange": "Shenzhen",
      "isUS": false,
      "note": "Eoptolink — foreign-listed in CNY"
    }
  ],
  "interconnect": [
    {
      "symbol": "CRDO",
      "exchange": "NASDAQ",
      "isUS": true
    },
    {
      "symbol": "ALAB",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "dell": [
    {
      "symbol": "DELL",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "supermicro": [
    {
      "symbol": "SMCI",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "odms": [
    {
      "symbol": "2382.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Quanta — foreign-listed in TWD"
    },
    {
      "symbol": "3231.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Wistron — foreign-listed in TWD"
    },
    {
      "symbol": "6669.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Wiwynn — foreign-listed in TWD"
    }
  ],
  "foxconn": [
    {
      "symbol": "2317.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Hon Hai — foreign-listed in TWD"
    }
  ],
  "equinix": [
    {
      "symbol": "EQIX",
      "exchange": "NASDAQ",
      "isUS": true
    },
    {
      "symbol": "DLR",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "vertiv": [
    {
      "symbol": "VRT",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "applieddigital": [
    {
      "symbol": "APLD",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "cisco": [
    {
      "symbol": "CSCO",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "hpe": [
    {
      "symbol": "HPE",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "ge": [
    {
      "symbol": "GEV",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "constellation": [
    {
      "symbol": "CEG",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "vistra": [
    {
      "symbol": "VST",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "entergy": [
    {
      "symbol": "ETR",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "talen": [
    {
      "symbol": "TLN",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "nextera": [
    {
      "symbol": "NEE",
      "exchange": "NYSE",
      "isUS": true,
      "note": "NextEra — verify separately"
    },
    {
      "symbol": "D",
      "exchange": "NYSE",
      "isUS": true,
      "note": "Dominion — verify separately"
    }
  ],
  "oklo": [
    {
      "symbol": "OKLO",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "wdc": [
    {
      "symbol": "WDC",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "sandisk": [
    {
      "symbol": "SNDK",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "seagate": [
    {
      "symbol": "STX",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "appliedmaterials": [
    {
      "symbol": "AMAT",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "lamresearch": [
    {
      "symbol": "LRCX",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "kla": [
    {
      "symbol": "KLAC",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "arista": [
    {
      "symbol": "ANET",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "bloomenergy": [
    {
      "symbol": "BE",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "iren": [
    {
      "symbol": "IREN",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "aep": [
    {
      "symbol": "AEP",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "ciphermining": [
    {
      "symbol": "CIFR",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "zhipuai": [
    {
      "symbol": "2513.HK",
      "exchange": "Hong Kong (HKEX)",
      "isUS": false,
      "note": "Foreign-listed in HKD — check a Hong Kong exchange source"
    }
  ],
  "tokyoelectron": [
    {
      "symbol": "8035.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "coherentcorp": [
    {
      "symbol": "COHR",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "lenovo": [
    {
      "symbol": "0992.HK",
      "exchange": "Hong Kong (HKEX)",
      "isUS": false,
      "note": "Foreign-listed in HKD — check a Hong Kong exchange source"
    }
  ],
  "apollo": [
    {
      "symbol": "APO",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "blackstone": [
    {
      "symbol": "BX",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "goldmansachs": [
    {
      "symbol": "GS",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "amphenol": [
    {
      "symbol": "APH",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "monolithicpower": [
    {
      "symbol": "MPWR",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "ttmtech": [
    {
      "symbol": "TTMI",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "teradyne": [
    {
      "symbol": "TER",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "advantest": [
    {
      "symbol": "6857.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "entegris": [
    {
      "symbol": "ENTG",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "ibiden": [
    {
      "symbol": "4062.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "fabrinet": [
    {
      "symbol": "FN",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "corning": [
    {
      "symbol": "GLW",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "kioxia": [
    {
      "symbol": "285A.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "celestica": [
    {
      "symbol": "CLS",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "jabil": [
    {
      "symbol": "JBL",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "eaton": [
    {
      "symbol": "ETN",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "schneider": [
    {
      "symbol": "SU.PA",
      "exchange": "Euronext Paris",
      "isUS": false,
      "note": "Foreign-listed in EUR — check a Paris exchange source"
    }
  ],
  "modine": [
    {
      "symbol": "MOD",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "corescientific": [
    {
      "symbol": "CORZ",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "blueowl": [
    {
      "symbol": "OWL",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "teconnectivity": [
    {
      "symbol": "TEL",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "sanmina": [
    {
      "symbol": "SANM",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "gigabyte": [
    {
      "symbol": "2376.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Gigabyte — foreign-listed in TWD"
    }
  ],
  "shinetsu": [
    {
      "symbol": "4063.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "unimicron": [
    {
      "symbol": "3037.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Unimicron — foreign-listed in TWD"
    }
  ],
  "siemensenergy": [
    {
      "symbol": "ENR.DE",
      "exchange": "Xetra",
      "isUS": false,
      "note": "Foreign-listed in EUR — check a Frankfurt exchange source"
    }
  ],
  "deltaelectronics": [
    {
      "symbol": "2308.TW",
      "exchange": "Taiwan",
      "isUS": false,
      "note": "Delta Electronics — foreign-listed in TWD"
    }
  ],
  "trane": [
    {
      "symbol": "TT",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "johnsoncontrols": [
    {
      "symbol": "JCI",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "cummins": [
    {
      "symbol": "CMI",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "caterpillar": [
    {
      "symbol": "CAT",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "comfortsystems": [
    {
      "symbol": "FIX",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "emcor": [
    {
      "symbol": "EME",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "quantaservices": [
    {
      "symbol": "PWR",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "cameco": [
    {
      "symbol": "CCJ",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "brookfield": [
    {
      "symbol": "BN",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "blackrock": [
    {
      "symbol": "BLK",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "kkr": [
    {
      "symbol": "KKR",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "ironmountain": [
    {
      "symbol": "IRM",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "gds": [
    {
      "symbol": "GDS",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "vnet": [
    {
      "symbol": "VNET",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "galaxydigital": [
    {
      "symbol": "GLXY",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "terawulf": [
    {
      "symbol": "WULF",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "hut8": [
    {
      "symbol": "HUT",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ],
  "generac": [
    {
      "symbol": "GNRC",
      "exchange": "NYSE",
      "isUS": true
    }
  ],
  "lasertec": [
    {
      "symbol": "6920.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "disco": [
    {
      "symbol": "6146.T",
      "exchange": "Tokyo Stock Exchange",
      "isUS": false,
      "note": "Foreign-listed in JPY — check a Tokyo exchange source"
    }
  ],
  "aaoi": [
    {
      "symbol": "AAOI",
      "exchange": "NASDAQ",
      "isUS": true
    }
  ]
};

/** Flat list of every distinct US-listed symbol across the map, for batch quote polling. */
export const allUSSymbols: string[] = Array.from(
  new Set(
    Object.values(tickers)
      .flat()
      .filter((t) => t.isUS)
      .map((t) => t.symbol)
  )
);

/** Every ticker row flattened with its owning node id, for the Markets table. */
export interface TickerRow extends TickerMeta {
  nodeId: string;
}
export const allTickerRows: TickerRow[] = Object.entries(tickers).flatMap(([nodeId, arr]) =>
  arr.map((t) => ({ ...t, nodeId }))
);
