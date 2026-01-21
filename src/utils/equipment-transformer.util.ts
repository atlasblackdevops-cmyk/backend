import { EquipmentMaintenance } from "../database/entities/equipment-maintenance.entity";
import { Equipment } from "../database/entities/equipment.entity";

/**
 * Transforms equipment entity to include only required fields in response
 */
export function transformEquipment(equipment: Equipment) {
  return {
    ...equipment,
    farm: equipment.farm
      ? {
          id: equipment.farm.id,
          farmName: equipment.farm.farmName,
          owner: equipment.farm.owner
            ? {
                id: equipment.farm.owner.id,
              }
            : null,
        }
      : null,
    createdBy: equipment.createdBy
      ? {
          id: equipment.createdBy.id,
          name: equipment.createdBy.name,
        }
      : null,
    updatedBy: equipment.updatedBy
      ? {
          id: equipment.updatedBy.id,
          name: equipment.updatedBy.name,
        }
      : null,
  };
}

/**
 * Transforms equipment maintenance entity to include only required fields in response
 */
export function transformMaintenanceLog(maintenance: EquipmentMaintenance) {
  return {
    ...maintenance,
    equipment: maintenance.equipment
      ? {
          ...maintenance.equipment,
          farm: maintenance.equipment.farm
            ? {
                id: maintenance.equipment.farm.id,
                farmName: maintenance.equipment.farm.farmName,
                owner: maintenance.equipment.farm.owner
                  ? {
                      id: maintenance.equipment.farm.owner.id,
                    }
                  : null,
              }
            : null,
        }
      : null,
    createdBy: maintenance.createdBy
      ? {
          id: maintenance.createdBy.id,
          name: maintenance.createdBy.name,
        }
      : null,
    updatedBy: maintenance.updatedBy
      ? {
          id: maintenance.updatedBy.id,
          name: maintenance.updatedBy.name,
        }
      : null,
  };
}
