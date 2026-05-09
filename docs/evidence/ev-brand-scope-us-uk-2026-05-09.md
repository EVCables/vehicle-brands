# EV/PHEV brand scope review — United States and United Kingdom — 2026-05-09

## Scope

This review checks whether `data/brands.json` omitted vehicle brands that are currently or generally available for sale new or used with plug-in electric vehicles relevant to EV cable lookup.

Requested vehicle hierarchy for later coverage data:

```text
Brand > Model > Market [United Kingdom | United States] > Year > Trim
- battery size
- outlet / vehicle charging inlet
```

For the United States, qualifying plug-in vehicles must be BEV, PHEV, or range-extended plug-in vehicles and have either a J1772-compatible AC inlet or a NACS / SAE J3400 inlet. CCS1 vehicles qualify because the AC portion is SAE J1772. For the UK, qualifying plug-in vehicles normally use Type 2 AC, CCS2, or older Type 1 / CHAdeMO combinations.

## Source strategy

- US primary source: EPA / DOE FuelEconomy.gov vehicle listings and DOE AFDC connector guidance.
- UK primary source: EV Database UK for structured BEV battery/inlet data, with official manufacturer pages used where useful for PHEV-only or launch confirmation.
- Manufacturer pages are preferred for final model/trim records; third-party databases are treated as discovery/supporting evidence.
- Low-volume, historical, commercial-only, or future-order brands are documented but not all are promoted into the active brand registry.

## Registry additions made in this PR

The following brands were added to `data/brands.json` and scaffolded under `src/` because they have clear US and/or UK plug-in passenger vehicle evidence and are relevant to current/new or generally available used EV/PHEV coverage.

| Brand | Market basis | Example plug-in vehicles | Connector/outlet basis | Evidence |
|---|---|---|---|---|
| Acura | US | ZDX BEV | J1772/CCS1 on current US examples | FuelEconomy ZDX: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50024 |
| Alfa Romeo | US + UK | Tonale PHEV; Junior Elettrica BEV | US PHEV J1772; UK BEV Type 2/CCS2 | FuelEconomy Tonale: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=48652 ; EVDB Junior: https://ev-database.org/uk/car/2184/Alfa-Romeo-Junior-Elettrica-54-kWh |
| Alpine | UK | A290 BEV; A390 BEV | Type 2/CCS2 | EVDB A290: https://ev-database.org/uk/car/2269/Alpine-A290-Electric-220-hp |
| Aston Martin | US | Valhalla PHEV | J1772 AC expected for US PHEV | FuelEconomy Valhalla: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50309 |
| Bentley | US + UK | Bentayga Hybrid; Flying Spur Hybrid; Continental GT/GTC PHEV | J1772 in US, Type 2 AC in UK/EU contexts | FuelEconomy Bentayga Hybrid: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49751 |
| Cadillac | US | ELR, CT6 Plug-In, LYRIQ, CELESTIQ, OPTIQ, ESCALADE IQ | J1772/CCS1 or NACS/J3400 transition | FuelEconomy LYRIQ: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49631 |
| Changan | UK | Deepal S05/S07 BEV retail context | Type 2/CCS2 | EVDB Deepal S07: https://ev-database.org/uk/car/3369/Changan-Deepal-S07-Standard |
| Chrysler | US | Pacifica Hybrid PHEV | J1772 AC | FuelEconomy Pacifica Hybrid: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49762 |
| Deepal | UK | S05/S07 BEV | Type 2/CCS2 | EVDB Deepal S07: https://ev-database.org/uk/car/3369/Changan-Deepal-S07-Standard |
| Dodge | US | Charger Daytona BEV | J1772/CCS1 or NACS/J3400 depending model-year transition | FuelEconomy Charger Daytona: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49957 |
| Ferrari | US + UK | 296 GTB/GTS, SF90 PHEV | J1772 AC in US PHEV context | FuelEconomy 296 GTB: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50260 |
| Geely | UK | EX5 BEV | Type 2/CCS2 | EVDB EX5: https://ev-database.org/uk/car/3308/Geely-EX5 |
| GMC | US | Hummer EV Pickup/SUV, Sierra EV | J1772/CCS1 or NACS/J3400 transition | FuelEconomy Sierra EV: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49660 |
| GWM | UK | ORA 03 / Funky Cat under GWM ORA retail branding | Type 2/CCS2 | EVDB GWM ORA 03: https://ev-database.org/uk/car/2091/GWM-ORA-03-Pureplus |
| Jaecoo | UK | Jaecoo 5 EV; Jaecoo 7 SHS PHEV | Type 2/CCS2 for EV | EVDB Jaecoo 5 EV: https://ev-database.org/uk/car/3336/Jaecoo-5-EV |
| Karma | US used | Revero, Revero GT, GS-6 PHEV/EREV | J1772 AC | FuelEconomy GS-6: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=43606 |
| Lamborghini | US + UK | Urus SE PHEV; Revuelto PHEV | J1772 AC in US PHEV context | FuelEconomy Urus SE: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49755 |
| Land Rover | US + UK | Defender, Discovery, Range Rover / Range Rover Sport PHEV | J1772 in US; Type 2 in UK | FuelEconomy Range Rover PHEV: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=48043 ; UK electric/hybrid hub: https://www.landrover.co.uk/electric-hybrid/index.html |
| Leapmotor | UK | T03, C10, B10 BEV | Type 2/CCS2 | EVDB T03: https://ev-database.org/uk/car/3039/Leapmotor-T03 |
| Lincoln | US | Aviator Grand Touring PHEV; Corsair PHEV | J1772 AC | FuelEconomy Corsair PHEV: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49768 |
| Lucid | US | Air, Gravity BEV | J1772/CCS1 or NACS/J3400 transition | FuelEconomy Air: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49967 |
| Maxus | UK | MIFA 9 electric MPV | Type 2/CCS2 | EVDB MIFA 9: https://ev-database.org/uk/car/1837/Maxus-MIFA-9 |
| McLaren | US + UK | Artura PHEV; P1 PHEV used | J1772 AC in US PHEV context | FuelEconomy Artura: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=45395 |
| Omoda | UK | Omoda E5 BEV; Omoda 9 PHEV | Type 2/CCS2 for EV | EVDB Omoda E5: https://ev-database.org/uk/car/3046/Omoda-E5 |
| Rivian | US | R1T, R1S BEV | J1772/CCS1 or NACS/J3400 transition | FuelEconomy R1S: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49734 |
| Skywell | UK | BE11 BEV | Type 2/CCS2 | EVDB BE11: https://ev-database.org/uk/car/3064/Skywell-BE11-Standard-Range |
| Suzuki | UK | e Vitara BEV; Across PHEV | Type 2/CCS2 for BEV | EVDB e Vitara: https://ev-database.org/uk/car/3212/Suzuki-e-VITARA-61-kWh-2WD |
| VinFast | US | VF 6, VF 7, VF 8, VF 9 BEV | J1772/CCS1 | FuelEconomy VF 8: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49086 |
| XPENG | UK | G6 BEV | Type 2/CCS2 | EVDB G6: https://ev-database.org/uk/car/3275/XPENG-G6-RWD-Long-Range |

## Deferred / edge-case brands not added in this PR

These were found during the scan but not added to the active registry because they are ultra-low-volume, defunct/rare, commercial/fleet-heavy, future-order only, or ambiguous as consumer-facing brand assets. They should be revisited only if EVCables wants very long-tail used/import/fleet coverage.

| Brand | Reason deferred | Evidence |
|---|---|---|
| Azure Dynamics | Fleet/commercial Transit Connect EV context rather than mainstream passenger brand | FuelEconomy Transit Connect Electric: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=31893 |
| CODA Automotive | Defunct, rare used-market BEV | FuelEconomy CODA: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=33337 |
| Kandi | Very limited US sales; revisit if long-tail used-market coverage is desired | FuelEconomy K27: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=43640 |
| Lordstown | Very low-volume pickup; consumer/commercial boundary | FuelEconomy Endurance: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=46519 |
| Plymouth | Historical 1990s EV minivan entries; not generally meaningful current used-market support | FuelEconomy Voyager: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=30974 |
| Scion | Discontinued Toyota sub-brand with limited iQ EV lease/compliance history | FuelEconomy iQ EV: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=33307 |
| Bugatti Rimac / Rimac | Ultra-low-volume supercar edge case; EPA make appears as Bugatti Rimac for Nevera | FuelEconomy Nevera R: https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49630 |
| GAC / AION | UK source appeared future/order-upcoming rather than generally available on 2026-05-09 | EVDB entries should be revisited when UK retail availability is confirmed |

## Notes for follow-up model/trim coverage

This PR expands brand identity scope and scaffolds asset folders only. It does not claim complete model/year/trim data. The requested `Brand > Model > Market > Year > Trim` EV/PHEV data should be stored separately from SVG asset metadata under `data/ev-coverage/` so model battery and connector data can evolve without contaminating logo provenance.
