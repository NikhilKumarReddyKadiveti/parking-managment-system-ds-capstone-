/**
 * Capstone Project Data Structures Implementations
 */

// 1. Array-based slot management helper
export class SlotArray {
  static search(slots, slotNumber) {
    // Linear search demonstration
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].slot_number === slotNumber) {
        return { index: i, slot: slots[i], steps: i + 1 };
      }
    }
    return { index: -1, slot: null, steps: slots.length };
  }

  static filterByType(slots, type) {
    // Traversal and filtering
    const result = [];
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].slot_type === type) {
        result.push(slots[i]);
      }
    }
    return result;
  }

  static countStatus(slots) {
    let available = 0;
    let occupied = 0;
    let booked = 0;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].status === 'available') available++;
      else if (slots[i].status === 'occupied') occupied++;
      else if (slots[i].status === 'booked') booked++;
    }
    return { available, occupied, booked };
  }
}

// 2. Queue (FIFO) implementation for waiting vehicles
export class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(element) {
    this.items.push(element);
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this.items.shift();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  toArray() {
    return [...this.items];
  }
}

// 3. Stack (LIFO) implementation for recent activity log
export class Stack {
  constructor(maxSize = 10) {
    this.items = [];
    this.maxSize = maxSize;
  }

  push(element) {
    if (this.items.length >= this.maxSize) {
      // Remove the oldest element (at index 0) to prevent overflow
      this.items.shift();
    }
    this.items.push(element);
  }

  pop() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  toArray() {
    // Return items in LIFO order (newest first)
    return [...this.items].reverse();
  }
}

// 4. Custom Hash Table with Chaining for Vehicle Search
// To show how a real Hash Table works with bucket hashing
export class HashTable {
  constructor(size = 7) {
    this.size = size;
    this.buckets = new Array(size).fill(null).map(() => []);
  }

  // DJB2 simple hashing function
  hash(key) {
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 33) ^ key.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  insert(key, value) {
    const index = this.hash(key);
    const bucket = this.buckets[index];
    
    // Check if key already exists, update if it does
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        bucket[i].value = value;
        return;
      }
    }
    
    // Add new pair
    bucket.push({ key, value });
  }

  search(key) {
    const index = this.hash(key);
    const bucket = this.buckets[index];
    let steps = 0;
    
    for (let i = 0; i < bucket.length; i++) {
      steps++;
      if (bucket[i].key === key) {
        return { value: bucket[i].value, bucketIndex: index, chainPosition: i, steps };
      }
    }
    
    return { value: null, bucketIndex: index, chainPosition: -1, steps };
  }

  delete(key) {
    const index = this.hash(key);
    const bucket = this.buckets[index];
    
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        bucket.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  getVisualData() {
    return this.buckets.map((bucket, index) => ({
      bucketIndex: index,
      elements: bucket.map(item => ({ key: item.key, val: item.value }))
    }));
  }
}

// 5. Linked List for chronological Parking Records
class ListNode {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

export class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  append(data) {
    const newNode = new ListNode(data);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.length++;
  }

  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  }

  getVisualStructure() {
    const nodes = [];
    let current = this.head;
    let id = 0;
    while (current) {
      nodes.push({
        id: id++,
        label: current.data.vehicle_number || `Rec-${current.data.id}`,
        details: current.data
      });
      current = current.next;
    }
    return nodes;
  }
}
