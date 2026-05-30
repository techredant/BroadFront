import iebc from "../../assets/data/iebc.json";

export function levelRoomName(levelType: string, levelValue: string) {
  return `level-${levelType}-${levelValue || "all"}`;
}

type County = {
  name: string;
  constituencies?: Array<{
    name: string;
    wards?: Array<{ name: string }>;
  }>;
};

const counties = (iebc as { counties?: County[] }).counties ?? [];

function findCountyByConstituency(constituencyName: string) {
  for (const county of counties) {
    const constituency = county.constituencies?.find(
      (c) => c.name === constituencyName,
    );
    if (constituency) return { county, constituency };
  }
  return null;
}

/** Must match backend `getFeedRoomsForViewer` so live socket events match the REST feed. */
export function getFeedRoomsForViewer(
  levelType: string,
  levelValue: string,
): string[] {
  const rooms = new Set<string>();

  if (!levelType) return [];

  if (levelType === "organization") {
    rooms.add(levelRoomName("organization", levelValue));
    return [...rooms];
  }

  rooms.add(levelRoomName(levelType, levelValue));

  switch (levelType) {
    case "home":
      rooms.add(levelRoomName("home", "all"));
      break;

    case "county": {
      const county = counties.find((c) => c.name === levelValue);
      for (const constituency of county?.constituencies ?? []) {
        rooms.add(levelRoomName("constituency", constituency.name));
      }
      break;
    }

    case "constituency": {
      for (const county of counties) {
        const constituency = county.constituencies?.find(
          (c) => c.name === levelValue,
        );
        if (constituency) {
          for (const ward of constituency.wards ?? []) {
            rooms.add(levelRoomName("ward", ward.name));
          }
          break;
        }
      }
      break;
    }

    default:
      break;
  }

  return [...rooms];
}
