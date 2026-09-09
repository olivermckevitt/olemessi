import type { InspectionKind } from "./types";

type KindRule = {
  kind: InspectionKind;
  pattern: RegExp;
};

const KIND_RULES: KindRule[] = [
  { kind: "foundation", pattern: /\b(footing|foundation|slab|rebar|grade beam|caisson|pile cap)\b/i },
  { kind: "framing", pattern: /\b(fram(e|ing)|shear wall|truss|sheathing|sill plate)\b/i },
  { kind: "electrical", pattern: /\b(electrical|electric|panel|feeder|lighting|low[- ]voltage)\b/i },
  { kind: "plumbing", pattern: /\b(plumb(ing)?|sewer|water service|gas pipe|dwv)\b/i },
  { kind: "mechanical", pattern: /\b(mechanical|hvac|duct|ahu|rtu|refrigerant)\b/i },
  { kind: "fire", pattern: /\b(fire|sprinkler|alarm|life safety|smoke control)\b/i },
  { kind: "insulation", pattern: /\b(insulation|energy|blower door|close[- ]?in|drywall hang)\b/i },
  { kind: "final", pattern: /\b(final|tco|c of o|certificate of occupanc|co inspect|punch)\b/i },
  { kind: "special", pattern: /\b(special inspect|testing agency|dbei|icc special|shop weld|ultrasonic|compaction test)\b/i },
];

const INSPECTION_HINTS: RegExp[] = [
  /\binspect(ion|or|ing)?\b/i,
  /\b(building dept|ahj|building official)\b/i,
  /\bspecial inspect/i,
  /\b(tco|c of o|certificate of occupanc)\b/i,
  /\bhold[\s-]?point\b/i,
  /\bthird[- ]party (test|inspect)/i,
];

const TYPE_HINTS = /^(inspect|milestone|hold|ahj|city|county|special)/i;

export function classifyInspectionKind(name: string, trade = "", type = ""): InspectionKind {
  const haystack = `${name} ${trade} ${type}`;
  for (const rule of KIND_RULES) {
    if (rule.pattern.test(haystack)) return rule.kind;
  }
  return "generic";
}

export function looksLikeInspection(name: string, type = ""): { match: boolean; reason: string } {
  if (type && TYPE_HINTS.test(type.trim())) {
    return { match: true, reason: `Type column is "${type}"` };
  }
  for (const hint of INSPECTION_HINTS) {
    if (hint.test(name)) {
      return { match: true, reason: `Matched "${hint.source}"` };
    }
  }
  return { match: false, reason: "No inspection keyword" };
}

export const CHECKLISTS: Record<InspectionKind, { chase: string[]; readiness: string[]; inspection: string[] }> = {
  foundation: {
    chase: [
      "Call geotech / special inspector: confirm they will be on site before pour.",
      "Get compaction reports and any batch plant / mix design submittals.",
      "Confirm rebar shop drawings are the approved revision.",
      "Tell the concrete sub the inspection window and that forms stay open until release.",
    ],
    readiness: [
      "Permit posted. Current approved structural set on site.",
      "Footing size, depth, and rebar match the drawings.",
      "Rebar on chairs. Not sitting in dirt.",
      "Special inspector daily report in hand if required.",
      "Work area safe, ladders in place, inspector path clear.",
    ],
    inspection: [
      "Meet the inspector at the gate. Have plans, permit, and reports ready.",
      "Do not pour until you have a verbal or written release.",
      "Photo the work and file the sign-off the same day.",
    ],
  },
  framing: {
    chase: [
      "Call framer: confirm hold-downs, straps, and shear nailing are complete.",
      "Get the special inspector's wood / steel report if the SOE required it.",
      "Confirm truss / joist manufacturer inspections are closed.",
      "Ask the framer who will be on site or on call for the city inspector.",
    ],
    readiness: [
      "Anchor bolts, hold-downs, and straps match the structural sheets.",
      "Shear wall nailing schedule complete. Edge and field spacing.",
      "Point loads, beams, and hangers installed. No missing hardware.",
      "Prior inspection corrections closed.",
      "Plans, calcs, and manufacturer details on site.",
    ],
    inspection: [
      "Walk the inspector the same path you walked yesterday.",
      "Have the framer reachable for hardware questions.",
      "Do not cover walls until the card is signed.",
    ],
  },
  electrical: {
    chase: [
      "Call electrician: get panel schedule, feeder calcs, and any megger / test reports.",
      "Confirm rough-in is 100% complete. Almost done is a fail.",
      "Get special inspection reports for fire alarm or emergency power if required.",
      "Confirm who will be on call when the inspector wants a device opened.",
    ],
    readiness: [
      "Boxes, nail plates, and supports complete. No open splices.",
      "Panel labeling matches the schedule.",
      "Fire-stopping at penetrations ready or scheduled the same morning.",
      "Approved electrical drawings on site, not last week's revision.",
      "Previous corrections signed off.",
    ],
    inspection: [
      "Have the electrician on site or 5 minutes away.",
      "Keep panels accessible. No stored material in front.",
      "File the signed card before lunch.",
    ],
  },
  plumbing: {
    chase: [
      "Call plumber: get pressure test results and any backflow / water service reports.",
      "Confirm DWV and water are under test before the inspector arrives.",
      "Get special inspector / city water reports if this is a service or sewer tie-in.",
      "Confirm the plumber will witness the test with the inspector.",
    ],
    readiness: [
      "Test in place. Gauges readable. No leaks.",
      "Nail plates and protection complete.",
      "Sleeves and fire-stopping at rated walls.",
      "Approved plumbing drawings and fixture schedule on site.",
      "Access to every test location. No covered work.",
    ],
    inspection: [
      "Do not drop test pressure until the inspector sees it.",
      "Plumber on site for the test.",
      "Photo gauges and the signed card.",
    ],
  },
  mechanical: {
    chase: [
      "Call HVAC sub: get duct pressure tests, equipment start-up sheets, and submittals.",
      "Confirm dampers, hangers, and fire/smoke devices are installed.",
      "Get TAB or commissioning status if this is a later inspection.",
      "Confirm who can open units for the inspector.",
    ],
    readiness: [
      "Duct support, insulation, and fire dampers complete for this phase.",
      "Access panels reachable.",
      "Approved mechanical drawings on site.",
      "Prior corrections closed.",
      "Work area clean. Units not used as shelves.",
    ],
    inspection: [
      "Have the HVAC lead on call.",
      "Walk shafts and mechanical rooms first.",
      "Capture sign-off before covering.",
    ],
  },
  fire: {
    chase: [
      "Call sprinkler / fire alarm sub: get material certs, hydrostatic test, and as-builts.",
      "Get the fire protection engineer's review letter if required.",
      "Confirm pre-test is done. Do not surprise the AHJ with a first-time test.",
      "Ask who will run the panel and who has the keys.",
    ],
    readiness: [
      "Heads, devices, and coverage match the approved shop drawings.",
      "Test papers from the pre-test in a folder.",
      "Fire department connection, valves, and panel accessible.",
      "Impairments cleared. No bagged heads in finished areas unless noted.",
      "Approved fire drawings on site.",
    ],
    inspection: [
      "AHJ first. Super stays with them the whole visit.",
      "Subcontractor operates the system. You do not guess at the panel.",
      "Get a written result before they leave the site.",
    ],
  },
  insulation: {
    chase: [
      "Call insulator: confirm R-values, air seal, and fire-blocking are complete.",
      "Get energy / blower door scheduling if this jurisdiction requires it.",
      "Confirm MEP rough inspections already passed. Do not cover failed work.",
      "Ask for manufacturer data sheets for spray foam if used.",
    ],
    readiness: [
      "Insulation matches the energy spec. No gaps at plates or corners.",
      "Fire-blocking and draft-stopping in place.",
      "MEP inspections signed. Card on site.",
      "Spray foam trim and ignition barrier complete if required.",
      "Work visible. Do not hang drywall ahead of the inspector.",
    ],
    inspection: [
      "Keep drywall off the walls until the card is signed.",
      "Have the energy report folder ready.",
      "Photo typical assemblies after sign-off.",
    ],
  },
  final: {
    chase: [
      "Call every trade that still owes closeout: test reports, as-builts, O&M, training.",
      "Get special inspection final letter and the engineer of record letter.",
      "Confirm fire, elevator, health, and other AHJs are closed.",
      "Tell subs the TCO / final date and that punch must be complete, not in progress.",
    ],
    readiness: [
      "Permit card and all prior sign-offs in one folder.",
      "Life safety systems tested and tagged.",
      "Means of egress clear. No stored material in corridors.",
      "Punch list complete enough that you would occupy it yourself.",
      "Keys, panels, and attic / roof access ready.",
    ],
    inspection: [
      "Walk the building the way the inspector will. Start at the main entrance.",
      "Do not argue incomplete work. Note it and schedule the reinspect.",
      "Get the written result and next steps before they drive off.",
    ],
  },
  special: {
    chase: [
      "Call the testing agency: confirm coverage, daily reports, and lab turnaround.",
      "Get every missing daily report before the city inspector asks for the packet.",
      "Confirm the engineer of record has the reports they need to write their letter.",
      "Tell the installing sub that work stays open until the special inspector releases it.",
    ],
    readiness: [
      "Special inspection log current. No missing days.",
      "Failed tests have a retest or an RFI answer.",
      "Work matches the approved shop drawings.",
      "Access and lighting adequate for the inspector.",
      "City / AHJ packet assembled: reports, mix designs, mill certs.",
    ],
    inspection: [
      "Have the testing agency on site or on a live call.",
      "Do not cover work that still needs a special inspector eyes-on.",
      "File reports the same day. Do not let them sit in a truck.",
    ],
  },
  generic: {
    chase: [
      "Call the responsible sub: you need their report / test package before the inspector reviews it.",
      "Confirm the work is actually complete. Ask what is still open.",
      "Get names and phone numbers for who will be on call the day of.",
      "Set a deadline: documents on your desk 48 hours before the inspection.",
    ],
    readiness: [
      "Permit posted. Current approved plans on site.",
      "Work for this phase is 100% complete.",
      "Previous corrections closed and documented.",
      "Subcontractor reports and test papers in one folder.",
      "Area clean, safe, and accessible.",
    ],
    inspection: [
      "Meet the inspector on time with the folder in your hand.",
      "Responsible trade reachable.",
      "Photo the sign-off and text the PM the result.",
    ],
  },
};

export function tradeForKind(kind: InspectionKind, fallback?: string | null): string {
  if (fallback && fallback.trim()) return fallback.trim();
  const map: Record<InspectionKind, string> = {
    foundation: "Concrete / geotech",
    framing: "Framer",
    electrical: "Electrician",
    plumbing: "Plumber",
    mechanical: "HVAC",
    fire: "Fire protection",
    insulation: "Insulator",
    final: "All trades",
    special: "Testing agency",
    generic: "Responsible sub",
  };
  return map[kind];
}
