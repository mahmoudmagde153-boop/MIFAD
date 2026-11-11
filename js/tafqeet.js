/**
 * Arabic Number to Words Converter (Tafqeet)
 * شركة مصر للمستحضرات الغذائية - ميفاد (MIFAD)
 * مصمم خصيصاً للجنيه المصري والقروش
 */

(function(global) {
  'use strict';

  const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  
  const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  
  const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n) {
    let out = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;

    if (h > 0) {
      out += HUNDREDS[h];
    }

    if (rem > 0) {
      if (out) out += ' و';
      if (rem < 20) {
        out += ONES[rem];
      } else {
        const o = rem % 10;
        const t = Math.floor(rem / 10);
        if (o > 0) {
          out += ONES[o] + ' و' + TENS[t];
        } else {
          out += TENS[t];
        }
      }
    }
    return out;
  }

  function numberToArabicWords(number) {
    if (number === 0 || isNaN(number)) return 'صفر';

    const num = Math.floor(Math.abs(number));
    if (num === 0) return 'صفر';

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const ones = num % 1000;

    let parts = [];

    // Billions
    if (billions > 0) {
      if (billions === 1) parts.push('مليار');
      else if (billions === 2) parts.push('ملياران');
      else if (billions >= 3 && billions <= 10) parts.push(convertGroup(billions) + ' مليارات');
      else parts.push(convertGroup(billions) + ' ملياراً');
    }

    // Millions
    if (millions > 0) {
      if (millions === 1) parts.push('مليون');
      else if (millions === 2) parts.push('مليونان');
      else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + ' ملايين');
      else parts.push(convertGroup(millions) + ' مليوناً');
    }

    // Thousands
    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف');
      else if (thousands === 2) parts.push('ألفان');
      else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + ' آلاف');
      else parts.push(convertGroup(thousands) + ' ألفاً');
    }

    // Remaining hundreds & ones
    if (ones > 0) {
      parts.push(convertGroup(ones));
    }

    return parts.join(' و');
  }

  function tafqeet(amount) {
    const val = Number(amount);
    if (isNaN(val) || val <= 0) return 'صفر جنيه مصري فقط لا غير';

    const pounds = Math.floor(val);
    const piasters = Math.round((val - pounds) * 100);

    const words = numberToArabicWords(pounds);
    let result = '';

    if (pounds === 1) {
      result = 'جنيه مصري واحد';
    } else if (pounds === 2) {
      result = 'جنيهان مصريان';
    } else if (pounds >= 3 && pounds <= 10) {
      result = words + ' جنيهات';
    } else {
      result = words + ' جنيهاً';
    }

    if (piasters > 0) {
      const piasterWords = numberToArabicWords(piasters);
      if (piasters === 1) {
        result += ' وقرش واحد';
      } else if (piasters === 2) {
        result += ' وقرشان';
      } else if (piasters >= 3 && piasters <= 10) {
        result += ' و' + piasterWords + ' قروش';
      } else {
        result += ' و' + piasterWords + ' قرشاً';
      }
    }

    return result + ' فقط لا غير';
  }

  global.tafqeet = tafqeet;
  global.numberToArabicWords = numberToArabicWords;

})(typeof window !== 'undefined' ? window : this);
