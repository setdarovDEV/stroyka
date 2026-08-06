import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  BrigadeStatus,
  ConfirmationStatus,
  DeliveryStatus,
  EstimateLineItemType,
  MachineStatus,
  MaterialRequestStatus,
  PrismaClient,
  ProjectStatus,
  ReportPeriod,
  ReportType,
  Role,
  TransactionStatus,
  TransactionType,
  UserStatus,
  ZoneGeometryType,
  ZoneStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const d = (value: string) => new Date(value);

async function resetDemoTenant() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  if (tenant) {
    await prisma.$executeRaw`
      DELETE FROM "incoming_confirmations" ic
      USING "warehouse_transactions" wt, "projects" p
      WHERE ic."transactionId" = wt."id"
        AND wt."projectId" = p."id"
        AND p."tenantId" = ${tenant.id}
    `;
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.project.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.delivery.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.contract.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.supplier.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.material.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.unit.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }

  await prisma.$executeRaw`
    DELETE FROM "incoming_confirmations"
    WHERE "transactionId" NOT IN (SELECT "id" FROM "warehouse_transactions")
  `;
}

async function main() {
  await resetDemoTenant();

  const adminPass = await bcrypt.hash('admin123', 10);
  const proabPass = await bcrypt.hash('proab123', 10);

  const tenant = await prisma.tenant.create({
    data: { name: 'Stroyka Demo Holding', slug: 'default' },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName: 'Aziz Karimov',
        username: 'admin',
        email: 'admin@stroyka.uz',
        phone: '+998901110001',
        passwordHash: adminPass,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName: 'Dilshod Rakhimov',
        username: 'proab',
        email: 'proab@stroyka.uz',
        phone: '+998901110002',
        passwordHash: proabPass,
        role: Role.PRORAB,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName: 'Madina Juraeva',
        username: 'warehouse',
        email: 'warehouse@stroyka.uz',
        phone: '+998901110003',
        passwordHash: proabPass,
        role: Role.PRORAB,
        status: UserStatus.INACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName: 'Bekzod Salimov',
        username: 'finance',
        email: 'finance@stroyka.uz',
        phone: '+998901110004',
        passwordHash: adminPass,
        role: Role.ADMIN,
        status: UserStatus.SUSPENDED,
      },
    }),
  ]);

  const [admin, proab, warehouseUser, financeUser] = users;

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'Nurafshon Residence',
        address: 'Tashkent, Yunusabad district',
        clientName: 'Nurafshon Invest LLC',
        startDate: d('2025-01-15'),
        plannedEndDate: d('2026-11-30'),
        status: ProjectStatus.ACTIVE,
      },
    }),
    prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'Samarqand Business Center',
        address: 'Samarqand, University boulevard',
        clientName: 'Registon Development',
        startDate: d('2025-04-01'),
        plannedEndDate: d('2027-02-15'),
        status: ProjectStatus.PLANNING,
      },
    }),
    prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'Fergana Logistics Hub',
        address: 'Fergana industrial zone',
        clientName: 'Silk Road Logistics',
        startDate: d('2024-06-01'),
        plannedEndDate: d('2026-03-30'),
        status: ProjectStatus.ON_HOLD,
      },
    }),
    prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'Bukhara Boutique Hotel',
        address: 'Bukhara old city',
        clientName: 'Ipak Hospitality',
        startDate: d('2023-03-10'),
        plannedEndDate: d('2025-10-01'),
        status: ProjectStatus.COMPLETED,
      },
    }),
    prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'Andijan Mall Extension',
        address: 'Andijan city center',
        clientName: 'Vodiy Retail Group',
        startDate: d('2025-08-01'),
        plannedEndDate: d('2026-09-01'),
        status: ProjectStatus.CANCELLED,
      },
    }),
  ]);

  const [mainProject] = projects;

  await prisma.projectUserAssignment.createMany({
    data: projects.flatMap((project) => [
      { projectId: project.id, userId: admin.id, role: Role.ADMIN },
      { projectId: project.id, userId: proab.id, role: Role.PRORAB },
    ]),
  });

  const units = await Promise.all([
    prisma.unit.create({ data: { tenantId: tenant.id, code: 'm3', name: 'Cubic meter' } }),
    prisma.unit.create({ data: { tenantId: tenant.id, code: 'kg', name: 'Kilogram' } }),
    prisma.unit.create({ data: { tenantId: tenant.id, code: 'pcs', name: 'Pieces' } }),
    prisma.unit.create({ data: { tenantId: tenant.id, code: 'hr', name: 'Hour' } }),
    prisma.unit.create({ data: { tenantId: tenant.id, code: 'm2', name: 'Square meter' } }),
    prisma.unit.create({ data: { tenantId: tenant.id, code: 't', name: 'Ton' } }),
  ]);
  const unitByCode = Object.fromEntries(units.map((unit) => [unit.code, unit]));

  const materials = await Promise.all([
    prisma.material.create({
      data: {
        tenantId: tenant.id,
        code: 'C-300',
        name: 'Concrete C300',
        category: 'Concrete',
        defaultUnitId: unitByCode.m3.id,
        description: 'Structural concrete for slabs and columns',
      },
    }),
    prisma.material.create({
      data: {
        tenantId: tenant.id,
        code: 'RB-12',
        name: 'Rebar 12mm',
        category: 'Steel',
        defaultUnitId: unitByCode.kg.id,
        description: 'A500 grade rebar',
      },
    }),
    prisma.material.create({
      data: {
        tenantId: tenant.id,
        code: 'BK-25',
        name: 'Brick 25x12x6',
        category: 'Masonry',
        defaultUnitId: unitByCode.pcs.id,
        description: 'Ceramic brick',
      },
    }),
    prisma.material.create({
      data: {
        tenantId: tenant.id,
        code: 'INS-50',
        name: 'Insulation 50mm',
        category: 'Finishing',
        defaultUnitId: unitByCode.m2.id,
        description: 'Facade thermal insulation',
      },
    }),
    prisma.material.create({
      data: {
        tenantId: tenant.id,
        code: 'CEM-500',
        name: 'Cement M500',
        category: 'Binder',
        defaultUnitId: unitByCode.t.id,
        description: 'Bagged cement for site mortar',
      },
    }),
  ]);
  const [concrete, rebar, brick, insulation, cement] = materials;

  const phases = await Promise.all([
    prisma.constructionPhase.create({
      data: {
        projectId: mainProject.id,
        name: 'Excavation and foundation',
        description: 'Earthworks, footing, and basement slab',
        order: 1,
        startDate: d('2025-01-15'),
        endDate: d('2025-05-15'),
      },
    }),
    prisma.constructionPhase.create({
      data: {
        projectId: mainProject.id,
        name: 'Structural frame',
        description: 'Columns, beams, slabs, stairs',
        order: 2,
        startDate: d('2025-05-16'),
        endDate: d('2026-02-28'),
      },
    }),
    prisma.constructionPhase.create({
      data: {
        projectId: mainProject.id,
        name: 'Envelope and masonry',
        description: 'Brickwork, facade, insulation',
        order: 3,
        startDate: d('2025-09-01'),
        endDate: d('2026-05-30'),
      },
    }),
    prisma.constructionPhase.create({
      data: {
        projectId: mainProject.id,
        name: 'MEP and finishing',
        description: 'Engineering networks and interior finishing',
        order: 4,
        startDate: d('2026-01-10'),
        endDate: d('2026-11-30'),
      },
    }),
  ]);

  const zones = await Promise.all([
    prisma.zone.create({
      data: {
        projectId: mainProject.id,
        phaseId: phases[0].id,
        name: 'Basement A',
        floor: 'B1',
        section: 'A',
        progressPercent: 100,
        status: ZoneStatus.COMPLETED,
        geometryType: ZoneGeometryType.BOX,
        geometryConfigJson: JSON.stringify({ x: 0, y: -3, z: 0, w: 35, h: 3, d: 42 }),
      },
    }),
    prisma.zone.create({
      data: {
        projectId: mainProject.id,
        phaseId: phases[1].id,
        name: 'Tower A frame',
        floor: '1-12',
        section: 'A',
        progressPercent: 68,
        status: ZoneStatus.IN_PROGRESS,
        geometryType: ZoneGeometryType.CUSTOM,
        geometryConfigJson: JSON.stringify({ floors: 12, grid: 'A1-D8' }),
      },
    }),
    prisma.zone.create({
      data: {
        projectId: mainProject.id,
        phaseId: phases[2].id,
        name: 'Tower B facade',
        floor: '1-9',
        section: 'B',
        progressPercent: 31,
        status: ZoneStatus.DELAYED,
        geometryType: ZoneGeometryType.CYLINDER,
        geometryConfigJson: JSON.stringify({ radius: 18, height: 36 }),
      },
    }),
    prisma.zone.create({
      data: {
        projectId: mainProject.id,
        phaseId: phases[3].id,
        name: 'Parking MEP',
        floor: 'B2',
        section: 'P',
        progressPercent: 4,
        status: ZoneStatus.NOT_STARTED,
        geometryType: ZoneGeometryType.BOX,
        geometryConfigJson: JSON.stringify({ x: 0, y: -6, z: 0, w: 60, h: 3, d: 70 }),
      },
    }),
    prisma.zone.create({
      data: {
        projectId: mainProject.id,
        phaseId: phases[2].id,
        name: 'Retail podium',
        floor: '1',
        section: 'R',
        progressPercent: 44,
        status: ZoneStatus.OVER_BUDGET,
        geometryType: ZoneGeometryType.CUSTOM,
        geometryConfigJson: JSON.stringify({ footprint: 'retail-podium-v2' }),
      },
    }),
  ]);

  const estimate = await prisma.estimate.create({
    data: {
      projectId: mainProject.id,
      name: 'Nurafshon Residence baseline BOQ',
      description: 'Imported baseline for demo reporting and variance tracking',
      importedAt: d('2025-01-20'),
      createdBy: admin.id,
    },
  });

  const estimateLines = await Promise.all([
    prisma.estimateLine.create({
      data: {
        estimateId: estimate.id,
        projectId: mainProject.id,
        code: 'MAT-CON-001',
        name: 'Concrete C300 slab and columns',
        category: 'Concrete',
        phaseId: phases[1].id,
        zoneId: zones[1].id,
        unitId: unitByCode.m3.id,
        plannedQuantity: 8200,
        usedQuantity: 5480,
        remainingQuantity: 2720,
        plannedUnitPrice: 720000,
        plannedTotalPrice: 5904000000,
        itemType: EstimateLineItemType.MATERIAL,
        notes: 'Primary structural concrete',
        createdBy: admin.id,
      },
    }),
    prisma.estimateLine.create({
      data: {
        estimateId: estimate.id,
        projectId: mainProject.id,
        code: 'LAB-FRM-001',
        name: 'Formwork and frame labor',
        category: 'Labor',
        phaseId: phases[1].id,
        zoneId: zones[1].id,
        unitId: unitByCode.hr.id,
        plannedQuantity: 18400,
        usedQuantity: 12120,
        remainingQuantity: 6280,
        plannedUnitPrice: 45000,
        plannedTotalPrice: 828000000,
        itemType: EstimateLineItemType.LABOR,
        createdBy: proab.id,
      },
    }),
    prisma.estimateLine.create({
      data: {
        estimateId: estimate.id,
        projectId: mainProject.id,
        code: 'MAC-CRN-001',
        name: 'Tower crane operations',
        category: 'Machine',
        phaseId: phases[1].id,
        zoneId: zones[1].id,
        unitId: unitByCode.hr.id,
        plannedQuantity: 3100,
        usedQuantity: 1960,
        remainingQuantity: 1140,
        plannedUnitPrice: 240000,
        plannedTotalPrice: 744000000,
        itemType: EstimateLineItemType.MACHINE,
        createdBy: admin.id,
      },
    }),
    prisma.estimateLine.create({
      data: {
        estimateId: estimate.id,
        projectId: mainProject.id,
        code: 'SRV-LAB-001',
        name: 'Concrete lab testing',
        category: 'Quality',
        phaseId: phases[1].id,
        zoneId: zones[0].id,
        unitId: unitByCode.pcs.id,
        plannedQuantity: 160,
        usedQuantity: 112,
        remainingQuantity: 48,
        plannedUnitPrice: 180000,
        plannedTotalPrice: 28800000,
        itemType: EstimateLineItemType.SERVICE,
        createdBy: financeUser.id,
      },
    }),
    prisma.estimateLine.create({
      data: {
        estimateId: estimate.id,
        projectId: mainProject.id,
        code: 'OTH-TMP-001',
        name: 'Temporary site works',
        category: 'Other',
        phaseId: phases[0].id,
        zoneId: zones[0].id,
        unitId: unitByCode.pcs.id,
        plannedQuantity: 1,
        usedQuantity: 0.72,
        remainingQuantity: 0.28,
        plannedUnitPrice: 195000000,
        plannedTotalPrice: 195000000,
        itemType: EstimateLineItemType.OTHER,
        createdBy: admin.id,
      },
    }),
  ]);

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: 'Tashkent Beton Zavod',
        contact: 'Sardor Usmonov',
        phone: '+998712000101',
        email: 'sales@tbz.uz',
        address: 'Tashkent ring road',
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: 'Metal Servis Group',
        contact: 'Nodira Pulatova',
        phone: '+998712000102',
        email: 'orders@metalservis.uz',
        address: 'Chirchiq industrial zone',
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: 'Vodiy Brick Factory',
        contact: 'Jasur Akhmedov',
        phone: '+998732000103',
        email: 'logistics@vodiybrick.uz',
        address: 'Fergana region',
      },
    }),
  ]);

  const contracts = await Promise.all([
    prisma.contract.create({
      data: {
        tenantId: tenant.id,
        number: 'NB-2025-001',
        supplierId: suppliers[0].id,
        startDate: d('2025-01-10'),
        endDate: d('2026-12-31'),
        notes: 'Concrete supply framework',
      },
    }),
    prisma.contract.create({
      data: {
        tenantId: tenant.id,
        number: 'MS-2025-014',
        supplierId: suppliers[1].id,
        startDate: d('2025-02-01'),
        endDate: d('2026-08-31'),
        notes: 'Steel and rebar procurement',
      },
    }),
    prisma.contract.create({
      data: {
        tenantId: tenant.id,
        number: 'VB-2025-006',
        supplierId: suppliers[2].id,
        startDate: d('2025-05-01'),
        endDate: d('2026-06-30'),
        notes: 'Brick and masonry materials',
      },
    }),
  ]);

  const deliveries = await Promise.all([
    prisma.delivery.create({
      data: {
        tenantId: tenant.id,
        supplierId: suppliers[0].id,
        expectedDate: d('2026-07-18'),
        actualDate: d('2026-07-18'),
        status: DeliveryStatus.DELIVERED,
        notes: 'Concrete batch delivered and confirmed',
      },
    }),
    prisma.delivery.create({
      data: {
        tenantId: tenant.id,
        supplierId: suppliers[1].id,
        expectedDate: d('2026-07-22'),
        status: DeliveryStatus.IN_TRANSIT,
        notes: 'Rebar truck passed Syrdarya checkpoint',
      },
    }),
    prisma.delivery.create({
      data: {
        tenantId: tenant.id,
        supplierId: suppliers[2].id,
        expectedDate: d('2026-07-16'),
        status: DeliveryStatus.OVERDUE,
        notes: 'Brick delivery delayed by factory issue',
      },
    }),
    prisma.delivery.create({
      data: {
        tenantId: tenant.id,
        supplierId: suppliers[0].id,
        expectedDate: d('2026-07-25'),
        status: DeliveryStatus.EXPECTED,
        notes: 'Next concrete pour booking',
      },
    }),
  ]);

  const warehouseItems = await Promise.all([
    prisma.warehouseItem.create({
      data: {
        projectId: mainProject.id,
        materialId: concrete.id,
        currentBalance: 510,
        reservedQuantity: 120,
        availableQuantity: 390,
        plannedTotal: 8200,
        usedQuantity: 5480,
        remainingEstimate: 2720,
        supplierId: suppliers[0].id,
        contractId: contracts[0].id,
        deliveryStatus: DeliveryStatus.DELIVERED,
        lastMovementDate: d('2026-07-18'),
        status: 'NORMAL',
      },
    }),
    prisma.warehouseItem.create({
      data: {
        projectId: mainProject.id,
        materialId: rebar.id,
        currentBalance: 84000,
        reservedQuantity: 21000,
        availableQuantity: 63000,
        plannedTotal: 620000,
        usedQuantity: 418000,
        remainingEstimate: 202000,
        supplierId: suppliers[1].id,
        contractId: contracts[1].id,
        deliveryStatus: DeliveryStatus.IN_TRANSIT,
        inTransitQuantity: 44000,
        expectedArrivalDate: d('2026-07-22'),
        estimatedDaysRemaining: 3,
        lastMovementDate: d('2026-07-17'),
        status: 'WATCH',
      },
    }),
    prisma.warehouseItem.create({
      data: {
        projectId: mainProject.id,
        materialId: brick.id,
        currentBalance: 18000,
        reservedQuantity: 12000,
        availableQuantity: 6000,
        plannedTotal: 430000,
        usedQuantity: 101000,
        remainingEstimate: 329000,
        supplierId: suppliers[2].id,
        contractId: contracts[2].id,
        deliveryStatus: DeliveryStatus.OVERDUE,
        inTransitQuantity: 35000,
        expectedArrivalDate: d('2026-07-16'),
        estimatedDaysRemaining: -3,
        lastMovementDate: d('2026-07-10'),
        status: 'LOW_STOCK',
      },
    }),
    prisma.warehouseItem.create({
      data: {
        projectId: mainProject.id,
        materialId: insulation.id,
        currentBalance: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        plannedTotal: 26000,
        usedQuantity: 0,
        remainingEstimate: 26000,
        deliveryStatus: DeliveryStatus.EXPECTED,
        expectedArrivalDate: d('2026-08-10'),
        estimatedDaysRemaining: 22,
        status: 'PLANNED',
      },
    }),
    prisma.warehouseItem.create({
      data: {
        projectId: mainProject.id,
        materialId: cement.id,
        currentBalance: 24,
        reservedQuantity: 4,
        availableQuantity: 20,
        plannedTotal: 260,
        usedQuantity: 168,
        remainingEstimate: 92,
        deliveryStatus: DeliveryStatus.NOT_APPLICABLE,
        lastMovementDate: d('2026-07-03'),
        status: 'NORMAL',
      },
    }),
  ]);

  const transactions = await Promise.all([
    prisma.warehouseTransaction.create({
      data: {
        projectId: mainProject.id,
        materialId: concrete.id,
        warehouseItemId: warehouseItems[0].id,
        estimateLineId: estimateLines[0].id,
        zoneId: zones[1].id,
        phaseId: phases[1].id,
        type: TransactionType.OPENING_BALANCE,
        quantity: 450,
        unitId: unitByCode.m3.id,
        transactionDate: d('2026-07-01'),
        status: TransactionStatus.CONFIRMED,
        sourceDestination: 'Initial demo inventory',
        createdByUserId: warehouseUser.id,
        confirmedByUserId: admin.id,
        notes: 'Opening stock for July',
      },
    }),
    prisma.warehouseTransaction.create({
      data: {
        projectId: mainProject.id,
        materialId: concrete.id,
        warehouseItemId: warehouseItems[0].id,
        estimateLineId: estimateLines[0].id,
        zoneId: zones[1].id,
        phaseId: phases[1].id,
        type: TransactionType.INCOMING,
        quantity: 180,
        unitId: unitByCode.m3.id,
        transactionDate: d('2026-07-18'),
        status: TransactionStatus.CONFIRMED,
        sourceDestination: suppliers[0].name,
        createdByUserId: warehouseUser.id,
        confirmedByUserId: admin.id,
        supplierId: suppliers[0].id,
        contractId: contracts[0].id,
        deliveryId: deliveries[0].id,
        notes: 'Delivered for tower A pour',
      },
    }),
    prisma.warehouseTransaction.create({
      data: {
        projectId: mainProject.id,
        materialId: rebar.id,
        warehouseItemId: warehouseItems[1].id,
        estimateLineId: estimateLines[0].id,
        zoneId: zones[1].id,
        phaseId: phases[1].id,
        type: TransactionType.OUTGOING,
        quantity: 9200,
        unitId: unitByCode.kg.id,
        transactionDate: d('2026-07-17'),
        status: TransactionStatus.CONFIRMED,
        sourceDestination: 'Tower A level 8',
        createdByUserId: proab.id,
        confirmedByUserId: warehouseUser.id,
        supplierId: suppliers[1].id,
        contractId: contracts[1].id,
        notes: 'Issued to reinforcement team',
      },
    }),
    prisma.warehouseTransaction.create({
      data: {
        projectId: mainProject.id,
        materialId: brick.id,
        warehouseItemId: warehouseItems[2].id,
        zoneId: zones[2].id,
        phaseId: phases[2].id,
        type: TransactionType.RETURN,
        quantity: 1350,
        unitId: unitByCode.pcs.id,
        transactionDate: d('2026-07-14'),
        status: TransactionStatus.PENDING,
        sourceDestination: 'Tower B masonry team',
        createdByUserId: proab.id,
        notes: 'Returned chipped pallets pending count',
      },
    }),
    prisma.warehouseTransaction.create({
      data: {
        projectId: mainProject.id,
        materialId: cement.id,
        warehouseItemId: warehouseItems[4].id,
        zoneId: zones[0].id,
        phaseId: phases[0].id,
        type: TransactionType.ADJUSTMENT,
        quantity: -2,
        unitId: unitByCode.t.id,
        transactionDate: d('2026-07-12'),
        status: TransactionStatus.REJECTED,
        sourceDestination: 'Inventory correction',
        createdByUserId: warehouseUser.id,
        confirmedByUserId: admin.id,
        notes: 'Rejected until photo evidence attached',
      },
    }),
    prisma.warehouseTransaction.create({
      data: {
        projectId: mainProject.id,
        materialId: rebar.id,
        warehouseItemId: warehouseItems[1].id,
        zoneId: zones[1].id,
        phaseId: phases[1].id,
        type: TransactionType.INCOMING,
        quantity: 44000,
        unitId: unitByCode.kg.id,
        transactionDate: d('2026-07-19'),
        status: TransactionStatus.PENDING,
        sourceDestination: suppliers[1].name,
        createdByUserId: warehouseUser.id,
        supplierId: suppliers[1].id,
        contractId: contracts[1].id,
        deliveryId: deliveries[1].id,
        notes: 'In transit, waiting for gate confirmation',
      },
    }),
  ]);

  await prisma.incomingConfirmation.createMany({
    data: [
      {
        transactionId: transactions[1].id,
        requestedQuantity: 180,
        confirmedQuantity: 178,
        status: ConfirmationStatus.CONFIRMED,
        confirmedBy: admin.id,
        confirmedAt: d('2026-07-18T16:30:00Z'),
        notes: 'Two cubic meters short, accepted with credit note',
      },
      {
        transactionId: transactions[5].id,
        requestedQuantity: 44000,
        status: ConfirmationStatus.PENDING,
        notes: 'Truck not arrived at gate yet',
      },
      {
        transactionId: transactions[4].id,
        requestedQuantity: 2,
        confirmedQuantity: 0,
        status: ConfirmationStatus.REJECTED,
        confirmedBy: admin.id,
        confirmedAt: d('2026-07-12T10:00:00Z'),
        notes: 'Adjustment rejected by finance',
      },
    ],
  });

  await prisma.materialRequest.createMany({
    data: [
      {
        projectId: mainProject.id,
        requestedBy: proab.id,
        materialId: concrete.id,
        quantity: 120,
        unitId: unitByCode.m3.id,
        purpose: 'Tower A slab pour',
        status: MaterialRequestStatus.DRAFT,
        notes: 'Draft request for next week',
      },
      {
        projectId: mainProject.id,
        requestedBy: proab.id,
        materialId: rebar.id,
        quantity: 44000,
        unitId: unitByCode.kg.id,
        purpose: 'Level 9 reinforcement',
        status: MaterialRequestStatus.SUBMITTED,
        notes: 'Submitted to warehouse',
      },
      {
        projectId: mainProject.id,
        requestedBy: proab.id,
        materialId: brick.id,
        quantity: 35000,
        unitId: unitByCode.pcs.id,
        purpose: 'Tower B masonry catch-up',
        status: MaterialRequestStatus.APPROVED,
        approvedBy: admin.id,
        approvedAt: d('2026-07-15'),
        notes: 'Approved despite low stock',
      },
      {
        projectId: mainProject.id,
        requestedBy: warehouseUser.id,
        materialId: insulation.id,
        quantity: 26000,
        unitId: unitByCode.m2.id,
        purpose: 'Facade package early procurement',
        status: MaterialRequestStatus.REJECTED,
        approvedBy: financeUser.id,
        approvedAt: d('2026-07-08'),
        notes: 'Rejected until revised facade schedule',
      },
      {
        projectId: mainProject.id,
        requestedBy: proab.id,
        materialId: cement.id,
        quantity: 12,
        unitId: unitByCode.t.id,
        purpose: 'Site mortar',
        status: MaterialRequestStatus.FULFILLED,
        approvedBy: admin.id,
        approvedAt: d('2026-07-04'),
        notes: 'Fulfilled from warehouse stock',
      },
    ],
  });

  const brigades = await Promise.all([
    prisma.brigade.create({
      data: {
        projectId: mainProject.id,
        name: 'Foundation crew',
        type: 'Concrete',
        responsiblePerson: 'Rustam Ergashev',
        numberOfWorkers: 22,
        startDate: d('2025-01-15'),
        expectedEndDate: d('2025-05-15'),
        actualEndDate: d('2025-05-18'),
        paymentSchedule: 'Biweekly',
        status: BrigadeStatus.COMPLETED,
        plannedProgress: 100,
        actualProgress: 100,
        notes: 'Closed with three days delay',
      },
    }),
    prisma.brigade.create({
      data: {
        projectId: mainProject.id,
        name: 'Frame crew A',
        type: 'Structural frame',
        responsiblePerson: 'Timur Yuldashev',
        numberOfWorkers: 36,
        startDate: d('2025-05-16'),
        expectedEndDate: d('2026-02-28'),
        paymentSchedule: 'Monthly',
        status: BrigadeStatus.ACTIVE,
        plannedProgress: 74,
        actualProgress: 68,
        notes: 'Behind because of rebar delivery gap',
      },
    }),
    prisma.brigade.create({
      data: {
        projectId: mainProject.id,
        name: 'Masonry crew B',
        type: 'Masonry',
        responsiblePerson: 'Akmal Saidov',
        numberOfWorkers: 28,
        startDate: d('2025-09-01'),
        expectedEndDate: d('2026-05-30'),
        paymentSchedule: 'Monthly',
        status: BrigadeStatus.ON_BREAK,
        plannedProgress: 43,
        actualProgress: 31,
        notes: 'Paused until brick delivery',
      },
    }),
    prisma.brigade.create({
      data: {
        projectId: mainProject.id,
        name: 'MEP rough-in crew',
        type: 'MEP',
        responsiblePerson: 'Shuhrat Aminov',
        numberOfWorkers: 18,
        startDate: d('2026-01-10'),
        expectedEndDate: d('2026-11-30'),
        paymentSchedule: 'Milestone',
        status: BrigadeStatus.PLANNED,
        plannedProgress: 12,
        actualProgress: 4,
        notes: 'Mobilization planned after frame level 10',
      },
    }),
  ]);

  await prisma.brigadeAssignment.createMany({
    data: [
      { brigadeId: brigades[0].id, userId: proab.id, startDate: d('2025-01-15'), endDate: d('2025-05-18') },
      { brigadeId: brigades[1].id, userId: proab.id, startDate: d('2025-05-16') },
      { brigadeId: brigades[2].id, userId: warehouseUser.id, startDate: d('2025-09-01') },
      { brigadeId: brigades[3].id, userId: financeUser.id, startDate: d('2026-01-10') },
    ],
  });

  await prisma.brigadeWorkLog.createMany({
    data: [
      {
        brigadeId: brigades[0].id,
        projectId: mainProject.id,
        phaseId: phases[0].id,
        zoneId: zones[0].id,
        workDate: d('2025-05-18'),
        workDescription: 'Basement slab closeout',
        workerCount: 20,
        hoursWorked: 176,
        outputProgress: 4,
        estimateLineId: estimateLines[4].id,
        createdBy: proab.id,
      },
      {
        brigadeId: brigades[1].id,
        projectId: mainProject.id,
        phaseId: phases[1].id,
        zoneId: zones[1].id,
        workDate: d('2026-07-18'),
        workDescription: 'Level 8 columns and slab prep',
        workerCount: 35,
        hoursWorked: 315,
        outputProgress: 1.8,
        estimateLineId: estimateLines[1].id,
        createdBy: proab.id,
      },
      {
        brigadeId: brigades[2].id,
        projectId: mainProject.id,
        phaseId: phases[2].id,
        zoneId: zones[2].id,
        workDate: d('2026-07-16'),
        workDescription: 'Facade masonry partial shift',
        workerCount: 12,
        hoursWorked: 72,
        outputProgress: 0.6,
        createdBy: warehouseUser.id,
      },
      {
        brigadeId: brigades[3].id,
        projectId: mainProject.id,
        phaseId: phases[3].id,
        zoneId: zones[3].id,
        workDate: d('2026-07-19'),
        workDescription: 'MEP route survey',
        workerCount: 5,
        hoursWorked: 35,
        outputProgress: 0.3,
        createdBy: proab.id,
      },
    ],
  });

  const machines = await Promise.all([
    prisma.machine.create({
      data: {
        projectId: mainProject.id,
        name: 'Tower Crane TC-01',
        type: 'Crane',
        model: 'Potain MCT 205',
        status: MachineStatus.IN_USE,
        notes: 'Main tower crane for Tower A',
      },
    }),
    prisma.machine.create({
      data: {
        projectId: mainProject.id,
        name: 'Excavator EX-02',
        type: 'Excavator',
        model: 'CAT 320',
        status: MachineStatus.AVAILABLE,
        notes: 'Idle after foundation completion',
      },
    }),
    prisma.machine.create({
      data: {
        projectId: mainProject.id,
        name: 'Concrete Pump CP-03',
        type: 'Concrete pump',
        model: 'Schwing S36X',
        status: MachineStatus.MAINTENANCE,
        notes: 'Hydraulic service scheduled',
      },
    }),
    prisma.machine.create({
      data: {
        projectId: mainProject.id,
        name: 'Old Generator GN-01',
        type: 'Generator',
        model: 'Perkins 1104',
        status: MachineStatus.RETIRED,
        notes: 'Replaced by rental power unit',
      },
    }),
  ]);

  await prisma.machineWorkLog.createMany({
    data: [
      {
        machineId: machines[0].id,
        projectId: mainProject.id,
        phaseId: phases[1].id,
        zoneId: zones[1].id,
        workDate: d('2026-07-18'),
        hoursWorked: 9.5,
        description: 'Lifted rebar cages and formwork',
        operatorName: 'Oybek Nazarov',
        createdBy: proab.id,
      },
      {
        machineId: machines[1].id,
        projectId: mainProject.id,
        phaseId: phases[0].id,
        zoneId: zones[0].id,
        workDate: d('2025-05-12'),
        hoursWorked: 6,
        description: 'Backfill around basement walls',
        operatorName: 'Farrukh Karimov',
        createdBy: proab.id,
      },
      {
        machineId: machines[2].id,
        projectId: mainProject.id,
        phaseId: phases[1].id,
        zoneId: zones[1].id,
        workDate: d('2026-07-15'),
        hoursWorked: 4,
        description: 'Short pour before maintenance stop',
        operatorName: 'Sirojiddin Musaev',
        createdBy: warehouseUser.id,
      },
    ],
  });

  const alertTypes = Object.values(AlertType);
  await prisma.alert.createMany({
    data: alertTypes.map((type, index) => ({
      projectId: mainProject.id,
      type,
      severity: [AlertSeverity.INFO, AlertSeverity.WARNING, AlertSeverity.CRITICAL][index % 3],
      title: type
        .toLowerCase()
        .split('_')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' '),
      message: `Demo ${type.toLowerCase().replace(/_/g, ' ')} signal for dashboard and filters.`,
      relatedEntityType: index % 2 === 0 ? 'warehouse_item' : 'zone',
      relatedEntityId: index % 2 === 0 ? warehouseItems[index % warehouseItems.length].id : zones[index % zones.length].id,
      status: [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED][index % 3],
      resolvedAt: index % 3 === 2 ? d('2026-07-19T09:00:00Z') : undefined,
    })),
  });

  const reportTypes = Object.values(ReportType);
  const periods = Object.values(ReportPeriod);
  await prisma.reportExport.createMany({
    data: reportTypes.map((reportType, index) => ({
      projectId: mainProject.id,
      reportType,
      period: periods[index % periods.length],
      format: index % 2 === 0 ? 'xlsx' : 'pdf',
      filePath: `exports/demo-${reportType.toLowerCase()}.${index % 2 === 0 ? 'xlsx' : 'pdf'}`,
      generatedBy: index % 2 === 0 ? admin.id : financeUser.id,
      createdAt: d(`2026-07-${String(10 + index).padStart(2, '0')}T08:00:00Z`),
    })),
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: admin.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: admin.id,
        details: JSON.stringify({ method: 'password', result: 'success' }),
        ipAddress: '127.0.0.1',
        createdAt: d('2026-07-19T07:10:00Z'),
      },
      {
        tenantId: tenant.id,
        userId: proab.id,
        action: 'CREATE',
        entityType: 'MaterialRequest',
        details: JSON.stringify({ material: 'RB-12', quantity: 44000 }),
        ipAddress: '127.0.0.1',
        createdAt: d('2026-07-19T08:15:00Z'),
      },
      {
        tenantId: tenant.id,
        userId: warehouseUser.id,
        action: 'CONFIRM',
        entityType: 'WarehouseTransaction',
        entityId: transactions[1].id,
        details: JSON.stringify({ requested: 180, confirmed: 178 }),
        ipAddress: '127.0.0.1',
        createdAt: d('2026-07-18T16:31:00Z'),
      },
      {
        tenantId: tenant.id,
        userId: financeUser.id,
        action: 'EXPORT',
        entityType: 'ReportExport',
        details: JSON.stringify({ report: 'FINANCIAL', format: 'pdf' }),
        ipAddress: '127.0.0.1',
        createdAt: d('2026-07-18T11:30:00Z'),
      },
    ],
  });

  console.log('Demo seed completed');
  console.log({
    tenant: tenant.slug,
    login: [
      { username: 'admin', password: 'admin123', role: Role.ADMIN },
      { username: 'proab', password: 'proab123', role: Role.PRORAB },
    ],
    counts: {
      users: await prisma.user.count({ where: { tenantId: tenant.id } }),
      projects: await prisma.project.count({ where: { tenantId: tenant.id } }),
      materials: await prisma.material.count({ where: { tenantId: tenant.id } }),
      estimateLines: await prisma.estimateLine.count({ where: { projectId: mainProject.id } }),
      warehouseTransactions: await prisma.warehouseTransaction.count({ where: { projectId: mainProject.id } }),
      alerts: await prisma.alert.count({ where: { projectId: mainProject.id } }),
      reports: await prisma.reportExport.count({ where: { projectId: mainProject.id } }),
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
