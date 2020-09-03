class Facade {
  Schema: any;

  constructor(Schema: any) {
    this.Schema = Schema;
  }

  create(input: any): any {
    return this.Schema.create(input);
  }

  async find(query: any): Promise<any> {
    let result;
    try { result = await this.Schema.find(query).lean().exec(); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result);
  }

  async findSort(query: any, sort: any): Promise<any> {
    let result;
    try { result = await this.Schema.find(query).sort(sort).lean().exec(); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result);
  }

  deleteMany(query: any): any {
    return this.Schema.deleteMany(query);
  }

  // async findOne(query) {
  //   let result;
  //   try { result = await this.Schema.findOne(query).lean().exec(); } catch (e) { return Promise.reject(e); }
  //   return Promise.resolve(result);
  // }

  // async findOneAndUpdate(conditions, update) {
  //   let result;
  //   try {
  //     result = await this.Schema.findOneAndUpdate(conditions, update, { new: true }).lean().exec();
  //   } catch (e) { return Promise.reject(e); }
  //   return Promise.resolve(result);
  // }

  findByIdAndUpdate(id: any, update: any): any {
    return this.Schema.findByIdAndUpdate(id, update, { new: true }).lean().exec();
  }

  //
  // findById(id) {
  //   return this.Schema.findById(id).lean().exec();
  // }
  //
  findByIdAndRemove(id: any): any {
    return this.Schema.findByIdAndRemove(id).lean().exec();
  }
}

export default Facade;
