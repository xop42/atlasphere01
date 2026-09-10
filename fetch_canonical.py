import urllib.request, json, time

ITEMS = {
    TUR: {
        landmark_query: Hagia_Sophia,
        drink_query: Turkish_coffee,
        festival_query: Cappadocia
    },
    FRA: {
        landmark_query: Eiffel_Tower,
        drink_query: Red_wine,
        festival_query: Bastille_Day
    },
    DEU: {
        landmark_query: Brandenburg_Gate,
        drink_query: Beer_in_Germany,
        festival_query: Oktoberfest
    },
    ITA: {
        landmark_query: Colosseum,
        drink_query: Espresso,
        festival_query: Carnival_of_Venice
    },
    ESP: {
        landmark_query: Sagrada_Família,
        drink_query: Sangria,
        festival_query: La_Tomatina
    },
    GBR: {
        landmark_query: Big_Ben,
        drink_query: Tea_in_the_United_Kingdom,
        festival_query: Notting_Hill_Carnival
    },
    GRC: {
        landmark_query: Parthenon,
        drink_query: Ouzo,
        festival_query: Santorini
    },
    JPN: {
        landmark_query: Mount_Fuji,
        drink_query: Matcha,
        festival_query: Hanami
    },
    CHN: {
        landmark_query: Great_Wall_of_China,
        drink_query: Chinese_tea,
        festival_query: Chinese_New_Year
    },
    IND: {
        landmark_query: Taj_Mahal,
        drink_query: Masala_chai,
        festival_query: Diwali
    },
    USA: {
        landmark_query: Statue_of_Liberty,
        drink_query: Bourbon_whiskey,
        festival_query: Independence_Day_(United_States)
    },
    BRA: {
        landmark_query: Christ_the_Redeemer_(statue),
        drink_query: Caipirinha,
        festival_query: Rio_Carnival
    },
    MEX: {
        landmark_query: Chichen_Itza,
        drink_query: Tequila,
        festival_query: Day_of_the_Dead
    },
    RUS: {
        landmark_query: Saint_Basil%27s_Cathedral,
        drink_query: Samovar,
        festival_query: Maslenitsa
    },
    EGY: {
        landmark_query: Giza_pyramid_complex,
        drink_query: Hibiscus_tea,
        festival_query: Karnak
    },
    AUS: {
        landmark_query: Sydney_Opera_House,
        drink_query: Flat_white,
        festival_query: Vivid_Sydney
    },
    CAN: {
        landmark_query: Niagara_Falls,
        drink_query: Caesar_(cocktail),
        festival_query: Quebec_Winter_Carnival
    },
    ZAF: {
        landmark_query: Table_Mountain,
        drink_query: Rooibos,
        festival_query: Kruger_National_Park
    },
    KOR: {
        landmark_query: Gyeongbokgung,
        drink_query: Soju,
        festival_query: Chuseok
    },
    SWE: {
        landmark_query: Gamla_stan,
        drink_query: Fika_(Sweden),
        festival_query: Midsummer
    },
    NLD: {
        landmark_query: Canals_of_Amsterdam,
        drink_query: Jenever,
        festival_query: Koningsdag
    },
    IRL: {
        landmark_query: Cliffs_of_Moher,
        drink_query: Guinness,
        festival_query: Saint_Patrick%27s_Day
    },
    FIN: {
        landmark_query: Suomenlinna,
        drink_query: Coffee_culture#Finland,
        festival_query: Aurora
    },
    NOR: {
        landmark_query: Geirangerfjord,
        drink_query: Akvavit,
        festival_query: Lofoten
    },
    PRT: {
        landmark_query: Belém_Tower,
        drink_query: Port_wine,
        festival_query: Pena_Palace
    },
    POL: {
        landmark_query: Wawel_Castle,
        drink_query: Żubrówka,
        festival_query: Kraków
    },
    CYP: {
        landmark_query: Paphos,
        drink_query: Commandaria,
        festival_query: Limassol
    },
    CYN: {
        landmark_query: Büyük_Han,
        drink_query: Turkish_coffee,
        festival_query: Bellapais_Abbey
    }
}

headers = {'User-Agent': 'AtlasphereWorldExplorer/2.0 (education project; contact: admin@atlasphere.local)'}

def get_wiki_thumb(title):
    url = fhttps://en.wikipedia.org/api/rest_v1/page/summary/{title}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'thumbnail' in data and 'source' in data['thumbnail']:
                return data['thumbnail']['source']
    except Exception as e:
        print(fError fetching {title}: {e})
    return None

results = {}
for code, queries in ITEMS.items():
    print(fFetching {code}...)
    lm = get_wiki_thumb(queries['landmark_query'])
    dr = get_wiki_thumb(queries['drink_query'])
    fe = get_wiki_thumb(queries['festival_query'])
    results[code] = {
        landmark: lm,
        drink: dr,
        festival: fe
    }
    print(f Landmark: {lm is not None}, Drink: {dr is not None}, Festival: {fe is not None})
    time.sleep(0.2)

with open('scratch_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(Done! Saved to scratch_results.json)
