// Require the necessary things from Sequelize
import { DataTypes, Model } from 'sequelize';
import { expect } from 'chai';

// This function should be used instead of `new Sequelize()`.
// It applies the config for your SSCCE to work on CI.
import createSequelizeInstance = require('./utils/create-sequelize-instance');
// This is an utility logger that should be preferred over `console.log()`.
import log = require('./utils/log');
// You can use sinon and chai assertions directly in your SSCCE if you want.
import sinon = require('sinon');

// Your SSCCE goes inside this function.
export async function run() {
  const sequelize = createSequelizeInstance({
    logQueryParameters: true,
    benchmark: true,
    define: {
      timestamps: false, // For less clutter in the SSCCE
    },
  });

  class Foo extends Model {
  };
  Foo.init({
    id: {
      type: DataTypes.NUMBER,
      primaryKey: true,
    },
    name: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Foo',
  });

  class Bar extends Model {
  };
  Bar.init({
    id: {
      primaryKey: true,
      type: DataTypes.NUMBER,
    },
    name: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Bar',
  });

  Foo.belongsTo(Bar, { targetKey: 'id' });
  Bar.hasMany(Foo, {
    sourceKey: 'id',
    foreignKey: 'BAR_HAS_FOOS_FK',
  });

  const spy = sinon.spy();
  sequelize.afterBulkSync(() => spy());
  await sequelize.sync();
  expect(spy).to.have.been.called;
  // create a bar
  log(await Bar.create({ id: 1, name: 'TS bar' }));

  // create foos
  log(await Foo.create({ id: 1, name: 'TS foo', BarId: 1 }));
  log(await Foo.create({ id: 2, name: 'TS foo', BarId: 1 }));
  log(await Foo.create({ id: 3, name: 'TS foo', BarId: 1 }));
  expect(await Foo.count()).to.equal(3);
  const findAllResult = await Foo.findAll({ include: [{ model: Bar, include: [{ model: Foo, separate: true }] }] });
  // Executed (default): SELECT `Foo`.`id`, `Foo`.`name`, `Foo`.`BarId`, `Foo`.`BAR_HAS_FOOS_FK`, `Bar`.`id` AS `Bar.id`, `Bar`.`name` AS `Bar.name` FRO
  // M `Foos` AS `Foo` LEFT OUTER JOIN `Bars` AS `Bar` ON `Foo`.`BarId` = `Bar`.`id`; [Elapsed time: 1 ms]

  //Executed (default): SELECT `id`, `name`, `BarId`, `BAR_HAS_FOOS_FK` FROM `Foos` AS `Foo` WHERE `Foo`.`BAR_HAS_FOOS_FK` IN (1, 1, 1);
  //                                                                                                                            ^^^^^^ this is the problem
  log(findAllResult);
}
