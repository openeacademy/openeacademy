import { PrismaClient, UserRole, UserStatus, PlanDuration, PlanType, Difficulty } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super Admin
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@openacademy.in' },
    update: {},
    create: {
      email: 'admin@openacademy.in',
      name: 'Super Admin',
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('✅ Super admin created:', superAdmin.email);

  // App Settings
  const settings = [
    { key: 'site_name', value: 'Open E Academy', group: 'general' },
    { key: 'site_tagline', value: 'Your Gateway to Government Job Success', group: 'general' },
    { key: 'free_preview_pages', value: '10', group: 'pdf' },
    { key: 'maintenance_mode', value: 'false', group: 'system' },
    { key: 'registration_enabled', value: 'true', group: 'auth' },
    { key: 'razorpay_enabled', value: 'true', group: 'payment' },
    { key: 'gst_percent', value: '18', group: 'payment' },
  ];
  for (const s of settings) {
    await prisma.appSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log('✅ App settings seeded');

  // Sample Exams
  const examData = [
    { name: 'SSC CGL', slug: 'ssc-cgl', description: 'Staff Selection Commission Combined Graduate Level', color: '#2563EB', isFeatured: true },
    { name: 'SSC CHSL', slug: 'ssc-chsl', description: 'Combined Higher Secondary Level', color: '#7C3AED', isFeatured: true },
    { name: 'UPSC CSE', slug: 'upsc-cse', description: 'Civil Services Examination', color: '#DC2626', isFeatured: true },
    { name: 'Banking (IBPS/SBI)', slug: 'banking', description: 'Bank PO and Clerk exams', color: '#059669', isFeatured: true },
    { name: 'Railway (RRB NTPC)', slug: 'railway-rrb-ntpc', description: 'Railway Recruitment Board NTPC', color: '#D97706', isFeatured: false },
    { name: 'Delhi Police', slug: 'delhi-police', description: 'Delhi Police Constable and Head Constable', color: '#0891B2', isFeatured: false },
    { name: 'UP Police', slug: 'up-police', description: 'Uttar Pradesh Police Constable', color: '#4F46E5', isFeatured: false },
  ];

  for (let i = 0; i < examData.length; i++) {
    const exam = await prisma.exam.upsert({
      where: { slug: examData[i].slug },
      update: {},
      create: { ...examData[i], sortOrder: i },
    });

    // Subjects for each exam
    const subjectNames = ['General Intelligence & Reasoning', 'General Awareness', 'Quantitative Aptitude', 'English Comprehension'];
    for (let j = 0; j < subjectNames.length; j++) {
      const subjectSlug = `${exam.slug}-${subjectNames[j].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await prisma.subject.upsert({
        where: { examId_slug: { examId: exam.id, slug: subjectSlug } },
        update: {},
        create: {
          examId: exam.id,
          name: subjectNames[j],
          slug: subjectSlug,
          sortOrder: j,
        },
      });
    }
  }
  console.log('✅ Sample exams and subjects seeded');

  // Sample Subscription Plans
  const plans = [
    { name: 'SSC CGL Monthly', type: PlanType.EXAM_PACK, duration: PlanDuration.ONE_MONTH, durationDays: 30, originalPrice: 499, discountedPrice: 299 },
    { name: 'SSC CGL Quarterly', type: PlanType.EXAM_PACK, duration: PlanDuration.THREE_MONTHS, durationDays: 90, originalPrice: 1299, discountedPrice: 799 },
    { name: 'Premium Annual', type: PlanType.PREMIUM, duration: PlanDuration.TWELVE_MONTHS, durationDays: 365, originalPrice: 3999, discountedPrice: 1999, isFeatured: true },
    { name: 'Lifetime Access', type: PlanType.PREMIUM, duration: PlanDuration.LIFETIME, durationDays: 36500, originalPrice: 9999, discountedPrice: 4999, isFeatured: true },
  ];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    await prisma.subscriptionPlan.upsert({
      where: { id: `seed-plan-${i}` },
      update: {},
      create: {
        id: `seed-plan-${i}`,
        ...plan,
        features: ['All PDFs', 'All Quizzes', 'Mock Tests', 'Analytics'],
        sortOrder: i,
      },
    });
  }
  console.log('✅ Subscription plans seeded');

  // Sample Coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME50' },
    update: {},
    create: {
      code: 'WELCOME50',
      type: 'PERCENTAGE',
      value: 50,
      maxDiscount: 500,
      minPurchase: 299,
      usageLimit: 1000,
    },
  });
  console.log('✅ Sample coupon seeded');

  console.log('🎉 Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
