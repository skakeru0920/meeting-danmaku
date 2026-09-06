import { describe, it, expect } from 'vitest';
import { LaneAllocator, countLanes, MAX_ACTIVE } from './lane.js';

describe('LaneAllocator', () => {
  describe('round-robin でレーンを割り当てる', () => {
    it('0 から順に配り、レーン数を超えたら 0 へ戻る', () => {
      const allocator = new LaneAllocator(3);

      expect(allocator.acquire()).toBe(0);
      expect(allocator.acquire()).toBe(1);
      expect(allocator.acquire()).toBe(2);
      expect(allocator.acquire()).toBe(0);
      expect(allocator.acquire()).toBe(1);
    });

    it('レーンが 1 本しかなければ常に 0 を返す', () => {
      const allocator = new LaneAllocator(1);

      expect(allocator.acquire()).toBe(0);
      expect(allocator.acquire()).toBe(0);
    });

    it('release してもレーンの巡回位置は戻らない', () => {
      const allocator = new LaneAllocator(3);

      allocator.acquire(); // 0
      allocator.acquire(); // 1
      allocator.release();

      // 解放されたのは件数だけ。次は 1 ではなく 2 が来る
      expect(allocator.acquire()).toBe(2);
    });
  });

  describe('同時表示上限', () => {
    it('上限に達すると null を返す', () => {
      const allocator = new LaneAllocator(4, 3);

      expect(allocator.acquire()).not.toBeNull();
      expect(allocator.acquire()).not.toBeNull();
      expect(allocator.acquire()).not.toBeNull();
      expect(allocator.acquire()).toBeNull();
    });

    it('release すると次の 1 件が入る', () => {
      const allocator = new LaneAllocator(4, 2);

      allocator.acquire();
      allocator.acquire();
      expect(allocator.acquire()).toBeNull();

      allocator.release();
      expect(allocator.acquire()).not.toBeNull();
      expect(allocator.acquire()).toBeNull();
    });

    it('既定の上限は 20', () => {
      const allocator = new LaneAllocator(4);

      for (let i = 0; i < MAX_ACTIVE; i += 1) {
        expect(allocator.acquire()).not.toBeNull();
      }
      expect(allocator.acquire()).toBeNull();
    });

    it('表示していないのに release されても件数が負にならない', () => {
      const allocator = new LaneAllocator(4, 1);

      allocator.release();
      allocator.release();

      // 負になっていれば、ここで 2 件目以降も通ってしまう
      expect(allocator.acquire()).not.toBeNull();
      expect(allocator.acquire()).toBeNull();
    });
  });

  it('レーン数が 0 以下なら作れない', () => {
    expect(() => new LaneAllocator(0)).toThrow();
    expect(() => new LaneAllocator(-1)).toThrow();
  });
});

describe('countLanes', () => {
  it('画面の高さをレーンの高さで割った本数を返す', () => {
    expect(countLanes(1000, 100)).toBe(10);
  });

  it('端数は切り捨てる。はみ出したレーンは引かない', () => {
    expect(countLanes(950, 100)).toBe(9);
  });

  it('画面がレーン 1 本より低くても 1 本は返す', () => {
    expect(countLanes(50, 100)).toBe(1);
    expect(countLanes(0, 100)).toBe(1);
  });
});
