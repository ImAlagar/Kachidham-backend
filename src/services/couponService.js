// services/couponService.js
import prisma from '../config/database.js';

class CouponService {
  
  async validateCoupon(code, subtotal) {
    const coupon = await prisma.coupon.findFirst({
      where: { 
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });

    if (!coupon) {
      throw new Error('Invalid or expired coupon');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    if (subtotal < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount should be ₹${coupon.minOrderAmount}`);
    }

    return coupon;
  }

  async calculateDiscount(coupon, subtotal) {
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(discount, subtotal);
  }

  async incrementCouponUsage(couponId) {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } }
    });
  }

  async createCoupon(data) {
    return await prisma.coupon.create({
      data: {
        ...data,
        code: data.code.toUpperCase()
      }
    });
  }

  async getCoupons() {
    return await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getCouponById(id) {
    return await prisma.coupon.findUnique({
      where: { id }
    });
  }

  // services/couponService.js
async getAvailableCoupons(subtotal = 0) {
  const currentDate = new Date();
  
 
  
  // Simple query first to test
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: currentDate },
      validUntil: { gte: currentDate }
    }
  });



  // Filter usage limit and min amount in JavaScript
  const filteredCoupons = coupons.filter(coupon => {
    const hasUsageLeft = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
    const meetsMinAmount = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount;
    

    
    return hasUsageLeft && meetsMinAmount;
  });



  return filteredCoupons;
}

  async updateCoupon(id, data) {
    return await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined
      }
    });
  }

  async deleteCoupon(id) {
    return await prisma.coupon.delete({
      where: { id }
    });
  }

  // Add toggle coupon status method
  async toggleCouponStatus(id, isActive) {
    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    return await prisma.coupon.update({
      where: { id },
      data: { isActive }
    });
  }

  // Add coupon stats method
  async getCouponStats() {
    const currentDate = new Date();

    // Get total coupons count
    const totalCoupons = await prisma.coupon.count();

    // Get active coupons (isActive = true and within validity period)
    const activeCoupons = await prisma.coupon.count({
      where: {
        isActive: true,
        validFrom: { lte: currentDate },
        validUntil: { gte: currentDate }
      }
    });

    // Get expired coupons
    const expiredCoupons = await prisma.coupon.count({
      where: {
        validUntil: { lt: currentDate }
      }
    });

    // Get total usage count
    const totalUsageResult = await prisma.coupon.aggregate({
      _sum: {
        usedCount: true
      }
    });

    // Get total discounts given
    const totalDiscountsResult = await prisma.coupon.aggregate({
      _sum: {
        totalDiscounts: true
      }
    });

    // Get coupons by type
    const couponsByType = await prisma.coupon.groupBy({
      by: ['discountType'],
      _count: {
        id: true
      }
    });

    // Get top used coupons
    const topUsedCoupons = await prisma.coupon.findMany({
      take: 5,
      orderBy: {
        usedCount: 'desc'
      },
      select: {
        id: true,
        code: true,
        usedCount: true,
        totalDiscounts: true
      }
    });

    // Get recent coupons
    const recentCoupons = await prisma.coupon.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        code: true,
        createdAt: true,
        isActive: true
      }
    });

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      inactiveCoupons: totalCoupons - activeCoupons - expiredCoupons,
      totalUsage: totalUsageResult._sum.usedCount || 0,
      totalDiscounts: totalDiscountsResult._sum.totalDiscounts || 0,
      couponsByType: couponsByType.reduce((acc, item) => {
        acc[item.discountType.toLowerCase()] = item._count.id;
        return acc;
      }, {}),
      topUsedCoupons,
      recentCoupons
    };
  }
}

export default new CouponService(); 